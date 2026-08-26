import { fetchAndParsePage } from '../utils/scraper.js';
import { calculateReadability, extractKeyphrases } from '../utils/nlp.js';
import { getGoogleAutocomplete } from '../utils/searchEngines.js';
import { OnPageAuditReport, ContentBrief } from '../types/seo.js';

export async function auditOnPage(
  urlOrHtml: string,
  focusKeyword?: string
): Promise<OnPageAuditReport> {
  const page = await fetchAndParsePage(urlOrHtml);
  const kw = (focusKeyword || '').toLowerCase().trim();
  const title = page.title;
  const metaDesc = page.metaDescription;
  const cleanText = page.cleanText;

  // Title Audit
  const titleLen = title.length;
  // Estimate pixel width: ~9-10px per character for standard font
  const estPixelWidth = Math.round(titleLen * 9.5);
  const titleStatus = titleLen >= 40 && titleLen <= 60 ? 'optimal' : titleLen < 40 ? 'too_short' : 'too_long';
  const titleHasKw = kw ? title.toLowerCase().includes(kw) : true;

  // Meta Description Audit
  const descLen = metaDesc.length;
  const descStatus = !metaDesc ? 'missing' : descLen >= 120 && descLen <= 160 ? 'optimal' : descLen < 120 ? 'too_short' : 'too_long';
  const descHasKw = kw ? metaDesc.toLowerCase().includes(kw) : true;
  const descHasCta = /\b(learn|discover|find|get|try|read|start|explore|click|check|see|download)\b/i.test(metaDesc);

  // Heading Audit
  const h1s = page.headings.h1;
  const h2s = page.headings.h2;
  const h3s = page.headings.h3;
  const headingIssues: string[] = [];

  if (h1s.length === 0) headingIssues.push('Missing H1 heading tag.');
  if (h1s.length > 1) headingIssues.push(`Multiple H1 tags detected (${h1s.length} found). Use exactly one H1 per page.`);
  if (h2s.length === 0) headingIssues.push('No H2 subheadings detected to structure content.');

  const kwInH1 = kw && h1s.length > 0 ? h1s[0].toLowerCase().includes(kw) : true;
  const kwInH2 = kw ? h2s.some(h => h.toLowerCase().includes(kw)) : true;

  // Content Body Audit
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const kwOccurrences = kw ? (cleanText.toLowerCase().match(new RegExp(`\\b${kw}\\b`, 'gi')) || []).length : 0;
  const kwDensity = wordCount > 0 && kw ? Number(((kwOccurrences / wordCount) * 100).toFixed(2)) : 0;

  const first100Words = words.slice(0, 100).join(' ').toLowerCase();
  const kwInFirst100 = kw ? first100Words.includes(kw) : true;

  const readability = calculateReadability(cleanText);

  // Images Audit
  const missingAlt = page.images.filter(img => !img.alt || img.alt.trim() === '').length;
  const largeImages = page.images.filter(img => img.src.endsWith('.bmp') || img.src.endsWith('.tiff')).map(img => img.src);

  // Links Audit
  const genericAnchors: string[] = [];
  page.$('a').each((_, el) => {
    const text = page.$(el).text().trim().toLowerCase();
    if (['click here', 'read more', 'learn more', 'link', 'here', 'website'].includes(text)) {
      genericAnchors.push(text);
    }
  });

  // Slug Audit
  let slug = '';
  if (page.url.startsWith('http')) {
    try {
      slug = new URL(page.url).pathname;
    } catch {}
  }
  const hasStopWords = /\b(and|or|the|in|at|by|with)\b/i.test(slug);

  // Overall Score calculation
  let score = 100;
  if (titleStatus !== 'optimal') score -= 10;
  if (!titleHasKw) score -= 15;
  if (descStatus !== 'optimal') score -= 10;
  if (!descHasKw) score -= 10;
  if (h1s.length !== 1) score -= 15;
  if (!kwInH1) score -= 10;
  if (missingAlt > 0) score -= Math.min(15, missingAlt * 3);
  if (wordCount < 600) score -= 15;
  if (!kwInFirst100) score -= 5;

  return {
    urlOrTitle: page.url,
    focusKeyword,
    overallScore: Math.max(0, score),
    titleAudit: {
      text: title,
      characterCount: titleLen,
      estimatedPixelWidth: estPixelWidth,
      status: titleStatus,
      containsKeyword: titleHasKw,
      recommendation: titleStatus === 'too_long' 
        ? `Shorten title to 50-60 characters (currently ${titleLen} chars / ~${estPixelWidth}px)`
        : titleStatus === 'too_short'
        ? `Expand title to at least 40-50 characters to improve CTR`
        : 'Title length and format are optimal.'
    },
    metaDescriptionAudit: {
      text: metaDesc,
      characterCount: descLen,
      status: descStatus,
      containsKeyword: descHasKw,
      hasCallToAction: descHasCta,
      recommendation: descStatus === 'missing'
        ? 'Add an enticing meta description between 120-155 characters with a clear call-to-action.'
        : descStatus === 'too_long'
        ? `Shorten meta description from ${descLen} characters to under 155 characters to avoid snippet truncation.`
        : 'Meta description is well-crafted.'
    },
    headingsAudit: {
      h1Count: h1s.length,
      h1Texts: h1s,
      h2Count: h2s.length,
      h3Count: h3s.length,
      hierarchyValid: h1s.length === 1 && h2s.length > 0,
      keywordInH1: kwInH1,
      keywordInH2: kwInH2,
      issues: headingIssues
    },
    contentBodyAudit: {
      wordCount,
      keywordOccurrences: kwOccurrences,
      keywordDensityPercent: kwDensity,
      keywordInFirst100Words: kwInFirst100,
      readabilityGrade: `${readability.gradeLevel} (${readability.readingLevelSummary})`
    },
    imagesAudit: {
      totalImages: page.images.length,
      missingAltCount: missingAlt,
      imagesWithAltCount: page.images.length - missingAlt,
      suspiciouslyLargeImages: largeImages
    },
    linksAudit: {
      internalLinksCount: page.links.internal.length,
      externalLinksCount: page.links.external.length,
      genericAnchorTextsFound: Array.from(new Set(genericAnchors))
    },
    urlSlugAudit: {
      slug,
      hasStopWords,
      containsKeyword: kw ? slug.toLowerCase().includes(kw.replace(/\s+/g, '-')) : true,
      status: hasStopWords ? 'warning' : 'optimal'
    }
  };
}

export async function generateContentBrief(
  primaryKeyword: string,
  secondaryKeywords: string[] = [],
  searchIntent?: 'Informational' | 'Transactional' | 'Commercial Investigation' | 'Navigational'
): Promise<ContentBrief> {
  const kw = primaryKeyword.trim();
  const autocomplete = await getGoogleAutocomplete(kw);
  const questions = autocomplete.filter(s => /^(what|how|why|is|can|best|where|which)/i.test(s));

  // Determine intent if not specified
  let intent = searchIntent;
  if (!intent) {
    if (/\b(buy|pricing|price|discount|cost|hire|service)\b/i.test(kw)) intent = 'Transactional';
    else if (/\b(best|vs|review|comparison|top|alternative)\b/i.test(kw)) intent = 'Commercial Investigation';
    else if (/\b(login|app|portal|download|website)\b/i.test(kw)) intent = 'Navigational';
    else intent = 'Informational';
  }

  const entities = Array.from(new Set([
    ...kw.split(/\s+/),
    ...secondaryKeywords.flatMap(k => k.split(/\s+/)),
    'guide', 'best practices', 'comparison', 'pricing', 'features', 'steps', 'workflow', 'architecture'
  ])).filter(w => w.length > 3);

  const titleFormulas = [
    `The Complete Guide to ${kw} (2026 Strategy & Best Practices)`,
    `${kw}: Everything You Need to Know to Get Started`,
    `Top 10 ${kw} Strategies for Modern Web Teams`
  ];

  const metaFormulas = [
    `Master ${kw} with our complete walkthrough. Learn best practices, key features, comparisons, and expert tips. Read the full guide now.`,
    `Looking for the best way to handle ${kw}? Discover proven frameworks, benchmarks, and actionable steps to succeed.`
  ];

  const headingOutline: ContentBrief['headingOutline'] = [
    {
      level: 'H1',
      text: titleFormulas[0],
      intentNotes: 'Primary target keyword in first 5 words with high CTR modifier.',
      suggestedEntitiesToMention: [kw]
    },
    {
      level: 'H2',
      text: `What is ${kw} and Why Does it Matter?`,
      intentNotes: 'Direct definition in first 2 sentences for Google AI Overview and Featured Snippet capture.',
      suggestedEntitiesToMention: ['definition', 'core architecture', 'key benefits']
    },
    {
      level: 'H2',
      text: `Key Benefits & Core Capabilities of ${kw}`,
      intentNotes: 'Structured comparison table and bullet points for high engagement.',
      suggestedEntitiesToMention: ['performance', 'scalability', 'efficiency']
    },
    {
      level: 'H2',
      text: `Step-by-Step Implementation Guide`,
      intentNotes: 'Actionable H3 walkthrough containing code snippets or execution steps.',
      suggestedEntitiesToMention: ['step 1', 'step 2', 'configuration', 'verification']
    },
    {
      level: 'H3',
      text: 'Step 1: Setup & Initial Prerequisites',
      intentNotes: 'Prerequisites checklist with code/command examples.',
      suggestedEntitiesToMention: ['install', 'configure']
    },
    {
      level: 'H3',
      text: 'Step 2: Deployment & Optimization',
      intentNotes: 'Best practices for production.',
      suggestedEntitiesToMention: ['production', 'metrics']
    },
    {
      level: 'H2',
      text: `Frequently Asked Questions About ${kw}`,
      intentNotes: 'Schema.org FAQPage targets extracted directly from People Also Ask.',
      suggestedEntitiesToMention: ['FAQ', 'troubleshooting']
    }
  ];

  const faqSection: ContentBrief['peopleAlsoAskFaqSection'] = (questions.length > 0 ? questions : [
    `How do I get started with ${kw}?`,
    `What are the most common mistakes when implementing ${kw}?`,
    `How does ${kw} compare to alternative solutions?`
  ]).slice(0, 4).map(q => ({
    question: q,
    suggestedAnswerBullets: [
      `Direct 1-2 sentence answer clarifying the core principle.`,
      `Specific example or link to the corresponding subtopic above.`
    ]
  }));

  return {
    primaryKeyword: kw,
    secondaryKeywords,
    searchIntent: intent,
    recommendedWordCount: {
      min: 1200,
      target: 1800,
      max: 2600
    },
    recommendedTitleFormulas: titleFormulas,
    recommendedMetaDescriptions: metaFormulas,
    headingOutline,
    requiredSemanticEntities: entities.slice(0, 12),
    peopleAlsoAskFaqSection: faqSection
  };
}

export async function scoreReadability(textOrUrl: string) {
  let text = textOrUrl;
  if (textOrUrl.startsWith('http') || textOrUrl.includes('<html') || textOrUrl.endsWith('.html')) {
    const page = await fetchAndParsePage(textOrUrl);
    text = page.cleanText;
  }
  return calculateReadability(text);
}
