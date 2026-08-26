import { fetchAndParsePage } from '../utils/scraper.js';
import { computeContentGapTfIdf, calculateReadability } from '../utils/nlp.js';
import { scrapeGoogleSerp, scrapeForumDiscussions } from '../utils/searchEngines.js';
import {
  SerpAnalysisResponse,
  CompetitorPageProfile,
  ContentGapAnalysis,
  CompetitorDiffMatrix,
  ForumDiscussionsPulse
} from '../types/seo.js';

export async function analyzeSerp(
  query: string,
  country = 'us',
  language = 'en',
  numResults = 10
): Promise<SerpAnalysisResponse> {
  return await scrapeGoogleSerp(query, country, language, numResults);
}

export async function profileCompetitor(url: string): Promise<CompetitorPageProfile> {
  const page = await fetchAndParsePage(url);
  const readability = calculateReadability(page.cleanText);

  // Schema extraction summary
  const schemaTypes: string[] = [];
  page.schemas.forEach(s => {
    if (s['@type']) {
      schemaTypes.push(typeof s['@type'] === 'string' ? s['@type'] : JSON.stringify(s['@type']));
    }
  });

  const missingAlt = page.images.filter(img => !img.alt || img.alt.trim() === '').length;
  const canonical = page.$('link[rel="canonical"]').attr('href') || '';
  const robots = page.$('meta[name="robots"]').attr('content') || 'all (default)';

  const openGraph: Record<string, string> = {};
  page.$('meta[property^="og:"]').each((_, el) => {
    const prop = page.$(el).attr('property');
    const content = page.$(el).attr('content');
    if (prop && content) {
      openGraph[prop] = content;
    }
  });

  return {
    url,
    title: page.title,
    description: page.metaDescription,
    h1: page.headings.h1,
    h2: page.headings.h2,
    h3: page.headings.h3,
    h4: page.headings.h4,
    wordCount: page.wordCount,
    readingTimeMinutes: Math.max(1, Math.round(page.wordCount / 200)),
    readingGradeLevel: `${readability.gradeLevel} (${readability.readingLevelSummary})`,
    schemasFound: Array.from(new Set(schemaTypes)),
    canonical,
    robotsDirectives: robots,
    openGraph,
    imageCount: page.images.length,
    imagesMissingAlt: missingAlt,
    internalLinksCount: page.links.internal.length,
    externalLinksCount: page.links.external.length
  };
}

export async function analyzeCompetitorContentGap(
  targetUrlOrText: string,
  targetKeyword: string,
  competitorUrls?: string[]
): Promise<ContentGapAnalysis> {
  let targetText = targetUrlOrText;
  let targetWordCount = 0;

  if (targetUrlOrText.startsWith('http') || targetUrlOrText.includes('.html')) {
    const targetPage = await fetchAndParsePage(targetUrlOrText);
    targetText = targetPage.cleanText;
    targetWordCount = targetPage.wordCount;
  } else {
    targetWordCount = targetText.split(/\s+/).filter(Boolean).length;
  }

  // Determine competitor URLs
  let urlsToScrape = competitorUrls || [];
  if (urlsToScrape.length === 0) {
    const serp = await scrapeGoogleSerp(targetKeyword, 'us', 'en', 5);
    urlsToScrape = serp.organicResults.slice(0, 3).map(r => r.url);
  }

  const competitorTexts: string[] = [];
  const competitorHeadings: Array<{ url: string; h2s: string[]; h3s: string[] }> = [];
  const scrapedUrls: string[] = [];
  let totalCompWords = 0;

  for (const url of urlsToScrape) {
    try {
      const page = await fetchAndParsePage(url);
      competitorTexts.push(page.cleanText);
      competitorHeadings.push({
        url,
        h2s: page.headings.h2,
        h3s: page.headings.h3
      });
      scrapedUrls.push(url);
      totalCompWords += page.wordCount;
    } catch {
      // Continue to next competitor if one fails
    }
  }

  const avgCompWords = competitorTexts.length > 0 ? Math.round(totalCompWords / competitorTexts.length) : 1500;
  const missingEntities = computeContentGapTfIdf(targetText, competitorTexts);

  // Identify heading topic gaps
  const headingGaps: ContentGapAnalysis['headingCoverageGaps'] = [];
  competitorHeadings.forEach(comp => {
    comp.h2s.forEach(h2 => {
      const h2Lower = h2.toLowerCase();
      // If target text does not contain key terms from this competitor H2
      const words = h2Lower.split(/\s+/).filter(w => w.length > 4);
      const isCovered = words.some(w => targetText.toLowerCase().includes(w));
      if (!isCovered && words.length >= 2) {
        const existing = headingGaps.find(g => g.subtopic === h2);
        if (existing) {
          existing.coveredByCompetitorUrls.push(comp.url);
        } else {
          headingGaps.push({
            subtopic: h2,
            coveredByCompetitorUrls: [comp.url]
          });
        }
      }
    });
  });

  const actionItems: string[] = [];
  if (targetWordCount < avgCompWords * 0.75) {
    actionItems.push(`Expand content depth: Target is ~${targetWordCount} words vs competitor average of ~${avgCompWords} words (deficit of ${avgCompWords - targetWordCount} words).`);
  }
  if (missingEntities.length > 0) {
    actionItems.push(`Integrate high-importance semantic entities: ${missingEntities.slice(0, 5).map(e => `"${e.term}"`).join(', ')}.`);
  }
  if (headingGaps.length > 0) {
    actionItems.push(`Add missing H2/H3 subtopics covered by top competitors: "${headingGaps[0]?.subtopic}" and "${headingGaps[1]?.subtopic || headingGaps[0]?.subtopic}".`);
  }

  return {
    targetUrlOrKeyword: targetUrlOrText.substring(0, 100),
    analyzedCompetitors: scrapedUrls,
    averageCompetitorWordCount: avgCompWords,
    targetWordCount,
    wordCountDelta: targetWordCount - avgCompWords,
    missingEntities,
    headingCoverageGaps: headingGaps.slice(0, 8),
    suggestedActionItems: actionItems
  };
}

export async function diffCompetitor(
  myUrl: string,
  competitorUrl: string,
  focusKeyword: string
): Promise<CompetitorDiffMatrix> {
  const [myPage, compPage] = await Promise.all([
    profileCompetitor(myUrl),
    profileCompetitor(competitorUrl)
  ]);

  const kw = focusKeyword.toLowerCase();
  const myHasKwTitle = myPage.title.toLowerCase().includes(kw);
  const compHasKwTitle = compPage.title.toLowerCase().includes(kw);

  const myHasKwH1 = myPage.h1.some(h => h.toLowerCase().includes(kw));
  const compHasKwH1 = compPage.h1.some(h => h.toLowerCase().includes(kw));

  const scorecard: CompetitorDiffMatrix['scorecard'] = [
    {
      metric: 'Title Tag Focus Keyword',
      myValue: myHasKwTitle ? 'Yes' : 'No',
      competitorValue: compHasKwTitle ? 'Yes' : 'No',
      winner: myHasKwTitle && !compHasKwTitle ? 'my_site' : !myHasKwTitle && compHasKwTitle ? 'competitor' : 'tie',
      notes: `My: "${myPage.title.substring(0, 45)}..." | Comp: "${compPage.title.substring(0, 45)}..."`
    },
    {
      metric: 'H1 Tag Focus Keyword',
      myValue: myHasKwH1 ? 'Yes' : 'No',
      competitorValue: compHasKwH1 ? 'Yes' : 'No',
      winner: myHasKwH1 && !compHasKwH1 ? 'my_site' : !myHasKwH1 && compHasKwH1 ? 'competitor' : 'tie',
      notes: `My H1 count: ${myPage.h1.length} | Comp H1 count: ${compPage.h1.length}`
    },
    {
      metric: 'Total Word Count & Depth',
      myValue: `${myPage.wordCount} words`,
      competitorValue: `${compPage.wordCount} words`,
      winner: myPage.wordCount >= compPage.wordCount ? 'my_site' : 'competitor',
      notes: myPage.wordCount >= compPage.wordCount ? 'Your content is deeper' : 'Competitor content is more extensive'
    },
    {
      metric: 'Structured Schema Markup',
      myValue: myPage.schemasFound.length > 0 ? myPage.schemasFound.join(', ') : 'None',
      competitorValue: compPage.schemasFound.length > 0 ? compPage.schemasFound.join(', ') : 'None',
      winner: myPage.schemasFound.length > compPage.schemasFound.length ? 'my_site' : myPage.schemasFound.length < compPage.schemasFound.length ? 'competitor' : 'tie',
      notes: `My schemas: ${myPage.schemasFound.length} | Comp schemas: ${compPage.schemasFound.length}`
    },
    {
      metric: 'Image Alt Tag Hygiene',
      myValue: `${myPage.imageCount - myPage.imagesMissingAlt}/${myPage.imageCount} with alt`,
      competitorValue: `${compPage.imageCount - compPage.imagesMissingAlt}/${compPage.imageCount} with alt`,
      winner: myPage.imagesMissingAlt === 0 ? 'my_site' : myPage.imagesMissingAlt <= compPage.imagesMissingAlt ? 'my_site' : 'competitor',
      notes: `Missing alt: My site (${myPage.imagesMissingAlt}) vs Competitor (${compPage.imagesMissingAlt})`
    },
    {
      metric: 'Heading Subtopic Structure (H2/H3)',
      myValue: `${myPage.h2.length} H2s, ${myPage.h3.length} H3s`,
      competitorValue: `${compPage.h2.length} H2s, ${compPage.h3.length} H3s`,
      winner: (myPage.h2.length + myPage.h3.length) >= (compPage.h2.length + compPage.h3.length) ? 'my_site' : 'competitor',
      notes: 'Comparison of subtopic granularity'
    }
  ];

  let myScore = 0;
  let compScore = 0;
  scorecard.forEach(item => {
    if (item.winner === 'my_site') myScore += 10;
    else if (item.winner === 'competitor') compScore += 10;
    else {
      myScore += 5;
      compScore += 5;
    }
  });

  const topPriorityFixes: string[] = [];
  if (!myHasKwTitle && compHasKwTitle) {
    topPriorityFixes.push(`Include primary keyword '${focusKeyword}' in your title tag.`);
  }
  if (!myHasKwH1 && compHasKwH1) {
    topPriorityFixes.push(`Ensure your H1 explicitly includes '${focusKeyword}'.`);
  }
  if (myPage.wordCount < compPage.wordCount * 0.8) {
    topPriorityFixes.push(`Expand total word count to match or exceed competitor's ${compPage.wordCount} words.`);
  }
  if (myPage.schemasFound.length === 0 && compPage.schemasFound.length > 0) {
    topPriorityFixes.push(`Add Schema.org markup (Competitor is using: ${compPage.schemasFound.join(', ')}).`);
  }

  return {
    myUrl,
    competitorUrl,
    focusKeyword,
    scorecard,
    summary: {
      myScore,
      competitorScore: compScore,
      winner: myScore > compScore ? 'my_site' : myScore < compScore ? 'competitor' : 'tie',
      topPriorityFixes
    }
  };
}

export async function analyzeForumDiscussions(topic: string): Promise<ForumDiscussionsPulse> {
  return await scrapeForumDiscussions(topic);
}
