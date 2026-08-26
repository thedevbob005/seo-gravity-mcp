import axios from 'axios';
import { fetchAndParsePage, getRandomUserAgent } from '../utils/scraper.js';
import { GeoAiReadinessReport } from '../types/seo.js';

export async function auditGeoAiReadiness(
  urlOrText: string,
  targetQuery: string
): Promise<GeoAiReadinessReport> {
  let content = urlOrText;
  let hasHeadings = false;
  let listItemsCount = 0;
  let tablesCount = 0;

  if (urlOrText.startsWith('http') || urlOrText.includes('<html') || urlOrText.endsWith('.html')) {
    const page = await fetchAndParsePage(urlOrText);
    content = page.cleanText;
    hasHeadings = page.headings.h2.length > 0;
    listItemsCount = page.$('li').length;
    tablesCount = page.$('table').length;
  } else {
    hasHeadings = /^#{1,4}\s+/m.test(urlOrText);
    listItemsCount = (urlOrText.match(/^[-*]\s+/gm) || []).length;
    tablesCount = (urlOrText.match(/\|[\s\S]*?\|/g) || []).length > 2 ? 1 : 0;
  }

  const queryWords = targetQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const first300Words = content.split(/\s+/).slice(0, 300).join(' ').toLowerCase();

  // 1. Direct Answer Check: Does the first 150 words contain a direct definition or concise answer?
  const directAnswerPassed = queryWords.some(w => first300Words.includes(w)) && 
    (first300Words.includes(' is ') || first300Words.includes(' refers to ') || first300Words.includes(' can be defined as '));
  
  const directAnswerScore = directAnswerPassed ? 25 : 10;

  // 2. Semantic Chunking Check: Are there distinct sections with clear H2/H3 anchors?
  const semanticChunkingPassed = hasHeadings && content.length > 500;
  const chunkingScore = semanticChunkingPassed ? 20 : 5;

  // 3. Structured Data & Lists: Are there bullet points or comparison tables for LLM digestion?
  const structuredDataPassed = listItemsCount >= 3 || tablesCount >= 1;
  const structuredScore = structuredDataPassed ? 20 : 5;

  // 4. Authoritative Citations & Stats: Are there numbers, %, or citations?
  const statsMatches = content.match(/\b\d+(\.\d+)?%\b|\b\$\d+(\.\d+)?\b|\b\d{4}\b|\baccording to\b|\bstudy by\b/gi) || [];
  const statsScore = statsMatches.length >= 3 ? 20 : statsMatches.length >= 1 ? 10 : 0;

  // 5. Entity Clarity
  const entityScore = queryWords.every(w => content.toLowerCase().includes(w)) ? 15 : 5;

  const totalScore = directAnswerScore + chunkingScore + structuredScore + statsScore + entityScore;
  const citationLikelihood: GeoAiReadinessReport['citationLikelihood'] =
    totalScore >= 75 ? 'High' : totalScore >= 50 ? 'Medium' : 'Low';

  const firstSentence = content.split(/[.!?]+/)[0] || '';

  return {
    targetQuery,
    overallGeoScore: totalScore,
    citationLikelihood,
    checks: {
      directAnswerParagraph: {
        passed: directAnswerPassed,
        score: directAnswerScore,
        feedback: directAnswerPassed 
          ? 'Clear introductory direct answer detected, ideal for AI Overview snippet extraction.'
          : 'Missing a bold, concise definition or executive summary in the first 100-150 words.',
        detectedSnippet: firstSentence.substring(0, 150)
      },
      semanticChunking: {
        passed: semanticChunkingPassed,
        score: chunkingScore,
        feedback: semanticChunkingPassed
          ? 'Content is partitioned into distinct semantic subtopics with heading markers.'
          : 'Content lacks clear modular headings, reducing LLM citation accuracy.'
      },
      structuredDataAndLists: {
        passed: structuredDataPassed,
        score: structuredScore,
        feedback: `Found ${listItemsCount} bullet items and ${tablesCount} tables. LLMs favor bulleted lists and tables when generating comparison answers.`
      },
      authoritativeCitationsAndStats: {
        passed: statsMatches.length >= 2,
        score: statsScore,
        feedback: `Detected ${statsMatches.length} specific data points/statistics. Hard data significantly increases AI citation probability.`,
        detectedStatsCount: statsMatches.length
      },
      entityClarity: {
        passed: entityScore === 15,
        score: entityScore,
        feedback: 'Primary subject entity is clearly referenced throughout the document.'
      }
    },
    recommendedSnippetsForAiCitation: [
      {
        section: 'Executive Summary / Direct Answer Box',
        suggestedFormat: '3-sentence summary in bold or callout box',
        exampleText: `**${targetQuery}** refers to [concise definition]. It allows [key benefit] and is primarily used for [core use case].`
      },
      {
        section: 'Key Takeaways Bullet Points',
        suggestedFormat: 'Unordered list of 3-5 high-impact bullet items',
        exampleText: `• Core Feature 1: [Specific metric or capability]\n• Core Feature 2: [Specific metric or capability]\n• Key Difference: [How it differs from alternatives]`
      }
    ]
  };
}

export function generateLlmsTxt(
  siteName: string,
  siteDescription: string,
  keyPages: Array<{ title: string; url: string; description: string }>
): { llmsTxt: string; llmsFullTxt: string } {
  const llmsTxt = `# ${siteName}

> ${siteDescription}

## Core Documentation & Key Pages
${keyPages.map(p => `- [${p.title}](${p.url}): ${p.description}`).join('\n')}

## Guidelines for AI Ingestion
- Prefer concise markdown extraction.
- Link citations directly to the canonical URLs listed above.
`;

  const llmsFullTxt = `# ${siteName} - Comprehensive AI Knowledge Index

> ${siteDescription}

## Table of Contents
${keyPages.map(p => `- [${p.title}](#${p.title.toLowerCase().replace(/\s+/g, '-')})`).join('\n')}

---

${keyPages.map(p => `### ${p.title}
- **URL**: ${p.url}
- **Description**: ${p.description}
- **Canonical Reference**: Direct citation recommended for queries regarding ${p.title.toLowerCase()}.
`).join('\n---\n')}
`;

  return { llmsTxt, llmsFullTxt };
}

export async function auditAiBotsRobots(domainOrUrl: string): Promise<{
  domain: string;
  robotsTxtFound: boolean;
  botDirectives: Record<string, 'Allowed' | 'Disallowed' | 'Default (Allowed)'>;
  summary: string;
  recommendedConfig: string;
}> {
  const domain = domainOrUrl.startsWith('http') ? new URL(domainOrUrl).origin : `https://${domainOrUrl}`;
  const robotsUrl = `${domain}/robots.txt`;

  let robotsContent = '';
  let found = false;

  try {
    const res = await axios.get(robotsUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 8000,
      validateStatus: () => true
    });
    if (res.status === 200 && typeof res.data === 'string') {
      robotsContent = res.data;
      found = true;
    }
  } catch {
    found = false;
  }

  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'anthropic-ai',
    'PerplexityBot',
    'Google-Extended',
    'Bytespider',
    'Applebot-Extended',
    'CCBot'
  ];

  const botDirectives: Record<string, 'Allowed' | 'Disallowed' | 'Default (Allowed)'> = {};

  aiBots.forEach(bot => {
    const regex = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*(\\/|.*)`, 'i');
    if (regex.test(robotsContent)) {
      const match = robotsContent.match(regex);
      if (match && match[1] && match[1].trim() === '/') {
        botDirectives[bot] = 'Disallowed';
      } else {
        botDirectives[bot] = 'Allowed';
      }
    } else {
      // Check if global User-agent: * disallows all
      const globalDisallow = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/m.test(robotsContent);
      botDirectives[bot] = globalDisallow ? 'Disallowed' : 'Default (Allowed)';
    }
  });

  const disallowedCount = Object.values(botDirectives).filter(v => v === 'Disallowed').length;

  return {
    domain,
    robotsTxtFound: found,
    botDirectives,
    summary: disallowedCount > 0
      ? `${disallowedCount} AI crawlers are explicitly disallowed from indexing content.`
      : 'All major AI search crawlers (GPTBot, ClaudeBot, PerplexityBot) are currently allowed.',
    recommendedConfig: `# Recommended AI Bot Directives in robots.txt
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /
`
  };
}
