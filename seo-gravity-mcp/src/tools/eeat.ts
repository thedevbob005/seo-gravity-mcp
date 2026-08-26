import { fetchAndParsePage } from '../utils/scraper.js';
import { scrapeGoogleSerp } from '../utils/searchEngines.js';
import { extractKeyphrases, extractEntitiesWithSalience } from '../utils/nlp.js';
import { InformationGainReport, EeatAuditReport } from '../types/seo.js';

export async function scoreInformationGain(
  myContentOrUrl: string,
  targetKeyword: string
): Promise<InformationGainReport> {
  let myText = myContentOrUrl;
  if (myContentOrUrl.startsWith('http') || myContentOrUrl.includes('<html') || myContentOrUrl.endsWith('.html')) {
    const page = await fetchAndParsePage(myContentOrUrl);
    myText = page.cleanText;
  }

  // 1. Fetch top competitor texts
  const serp = await scrapeGoogleSerp(targetKeyword, 'us', 'en', 3);
  const competitorTexts: string[] = [];

  for (const r of serp.organicResults.slice(0, 3)) {
    try {
      const p = await fetchAndParsePage(r.url);
      competitorTexts.push(p.cleanText);
    } catch {}
  }

  const myEntities = extractEntitiesWithSalience(myText);
  const compEntities = extractEntitiesWithSalience(competitorTexts.join(' '));

  const compEntityNames = new Set(compEntities.map(e => e.name.toLowerCase()));
  const uniqueEntities = myEntities
    .filter(e => !compEntityNames.has(e.name.toLowerCase()))
    .map(e => e.name);

  // Detect specific novel signals: data points, unique methodologies, case studies
  const dataPointsAndStats = (myText.match(/\b\d+(\.\d+)?%\b|\b\$\d+(\.\d+)?\b|\b\d{2,}\s+(users|companies|participants|queries|customers|nodes)\b/gi) || [])
    .slice(0, 6);

  const caseStudiesOrExamples = (myText.match(/\b(for example|case study|in our testing|we found that|our data shows|in practice)\b[\s\S]{10,80}\./gi) || [])
    .slice(0, 4);

  const uniqueQuotes = (myText.match(/"([^"]{15,100})"/g) || []).slice(0, 3);

  // Score calculation:
  // Base 30
  // + 5 per unique entity (max 25)
  // + 5 per distinct stat (max 20)
  // + 10 per case study/test result (max 20)
  // + 5 per quote (max 10)
  let rawScore = 30 + (uniqueEntities.length * 5) + (dataPointsAndStats.length * 4) + (caseStudiesOrExamples.length * 7) + (uniqueQuotes.length * 3);
  const informationGainScore = Math.min(100, Math.max(10, rawScore));

  const noveltyTier: InformationGainReport['noveltyTier'] =
    informationGainScore >= 75
      ? 'Exceptional (High Information Gain)'
      : informationGainScore >= 50
      ? 'Moderate'
      : 'Low (Rehashed / Generic AI Risk)';

  const recommendations: string[] = [];
  if (dataPointsAndStats.length < 2) {
    recommendations.push('Include proprietary metrics, benchmark percentages, or original experiment numbers to distinguish from generic summary articles.');
  }
  if (caseStudiesOrExamples.length === 0) {
    recommendations.push('Add a real-world case study or first-person testing walkthrough ("In our tests...", "When we implemented X...").');
  }
  if (uniqueEntities.length < 3) {
    recommendations.push('Introduce unique frameworks, tools, or named methodologies not already saturated across top competitor pages.');
  }

  return {
    targetKeyword,
    informationGainScore,
    noveltyTier,
    uniqueEntitiesDetected: uniqueEntities.slice(0, 8),
    competitorOverlapPercentage: Math.max(20, 100 - uniqueEntities.length * 8),
    originalElementsFound: {
      dataPointsAndStats,
      caseStudiesOrExamples,
      uniqueMethodologiesOrQuotes: uniqueQuotes
    },
    recommendationsToIncreaseGain: recommendations
  };
}

export async function auditEeat(urlOrHtml: string): Promise<EeatAuditReport> {
  const page = await fetchAndParsePage(urlOrHtml);
  const html = page.html;
  const cleanText = page.cleanText;

  // 1. Author signals
  const hasAuthorByline = /\b(by\s+[A-Z][a-z]+|written by|author|editorial team)\b/i.test(html) || page.$('[rel="author"], .author, .byline, [itemprop="author"]').length > 0;
  const hasAuthorBio = /\b(bio|about the author|author-bio|experience|credentials)\b/i.test(html);
  
  const personSchemas = page.schemas.filter(s => s['@type'] === 'Person' || (s['@graph'] && s['@graph'].some((g: any) => g['@type'] === 'Person')));
  const hasPersonSchema = personSchemas.length > 0;

  const sameAsProfiles: string[] = [];
  page.$('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="wikipedia.org"], a[href*="wikidata.org"]').each((_, el) => {
    const href = page.$(el).attr('href');
    if (href && !sameAsProfiles.includes(href)) {
      sameAsProfiles.push(href);
    }
  });

  // 2. Transparency signals
  const hasEditorialPolicy = /editorial\s+policy|fact\s+check|correction\s+policy|methodology/i.test(html);
  const hasFactCheckDisclaimer = /fact-checked|medical\s+review|financial\s+disclaimer|reviewed\s+by/i.test(html);
  const hasPublishDate = /datePublished|published\s+on|date-published|<time/i.test(html);
  const hasModifiedDate = /dateModified|updated\s+on|last\s+updated|last-modified/i.test(html);

  // 3. Contact & Entity signals
  const hasAboutPageLink = page.links.internal.some(l => /about|company|team/i.test(l)) || page.links.external.some(l => /about/i.test(l));
  const hasContactInfo = /contact|support|mailto:|tel:|customer-service/i.test(html);
  const hasPhysicalAddress = /address|postalCode|streetAddress|HQ|headquarters/i.test(html);

  // 4. External authoritative citations
  const govEduOrgLinks = page.links.external.filter(l => /\.gov|\.edu|\.org|wikipedia\.org|ncbi\.nlm\.nih\.gov/i.test(l)).length;

  // Calculate score
  let score = 20;
  if (hasAuthorByline) score += 15;
  if (hasAuthorBio) score += 10;
  if (hasPersonSchema) score += 15;
  if (sameAsProfiles.length > 0) score += 10;
  if (hasEditorialPolicy || hasFactCheckDisclaimer) score += 10;
  if (hasPublishDate && hasModifiedDate) score += 10;
  if (hasAboutPageLink && hasContactInfo) score += 10;

  const overallEeatScore = Math.min(100, score);
  const trustLevel: EeatAuditReport['trustLevel'] =
    overallEeatScore >= 75 ? 'High Authority' : overallEeatScore >= 50 ? 'Moderate' : 'Needs Improvement';

  const improvements: string[] = [];
  if (!hasPersonSchema) {
    improvements.push('Embed Schema.org Person structured data for the author with explicit sameAs links (LinkedIn, Wikidata).');
  }
  if (!hasAuthorBio) {
    improvements.push('Add an author biography highlighting subject-matter credentials, years of experience, and industry background.');
  }
  if (!hasModifiedDate) {
    improvements.push('Display visible "Last Updated / Modified" timestamps to reinforce freshness.');
  }
  if (sameAsProfiles.length === 0) {
    improvements.push('Link author social profiles (LinkedIn, X/Twitter, personal website) to establish clear verifiable entity connection.');
  }

  return {
    overallEeatScore,
    trustLevel,
    signals: {
      authorIdentity: {
        hasAuthorByline,
        hasAuthorBio,
        hasPersonSchema,
        sameAsProfilesLinked: sameAsProfiles.slice(0, 5)
      },
      transparency: {
        hasEditorialPolicy,
        hasFactCheckDisclaimer,
        hasPublishDate,
        hasModifiedDate
      },
      contactAndEntity: {
        hasAboutPageLink,
        hasContactInfo,
        hasPhysicalAddress
      },
      citationsAndReferences: {
        externalAuthoritativeCitationsCount: page.links.external.length,
        peerReviewedOrGovLinksCount: govEduOrgLinks
      }
    },
    actionableImprovements: improvements
  };
}
