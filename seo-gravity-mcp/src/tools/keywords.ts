import { getGoogleAutocomplete, getAlphabetSoupSuggestions } from '../utils/searchEngines.js';
import { KeywordClusterGroup, SearchIntentClassification } from '../types/seo.js';

export async function getKeywordSuggestions(
  seedKeyword: string,
  includeAlphabetSoup = true,
  modifiers: string[] = ['best', 'vs', 'pricing', 'alternative', 'how to', 'free']
): Promise<{
  seed: string;
  totalSuggestions: number;
  coreSuggestions: string[];
  modifierSuggestions: Record<string, string[]>;
  alphabetSoupSuggestions?: Record<string, string[]>;
}> {
  const core = await getGoogleAutocomplete(seedKeyword);

  const modResults: Record<string, string[]> = {};
  await Promise.all(
    modifiers.map(async mod => {
      const results = await getGoogleAutocomplete(`${seedKeyword} ${mod}`);
      if (results.length > 0) modResults[mod] = results.slice(0, 5);
    })
  );

  let alphabetSoup: Record<string, string[]> | undefined;
  if (includeAlphabetSoup) {
    alphabetSoup = await getAlphabetSoupSuggestions(seedKeyword);
  }

  let total = core.length;
  Object.values(modResults).forEach(arr => total += arr.length);
  if (alphabetSoup) {
    Object.values(alphabetSoup).forEach(arr => total += arr.length);
  }

  return {
    seed: seedKeyword,
    totalSuggestions: total,
    coreSuggestions: core,
    modifierSuggestions: modResults,
    alphabetSoupSuggestions: alphabetSoup
  };
}

export async function findQuestions(topic: string): Promise<{
  topic: string;
  totalQuestions: number;
  questionClusters: {
    how: string[];
    what: string[];
    why: string[];
    can: string[];
    is: string[];
    best: string[];
  };
}> {
  const questionWords = ['how to', 'what is', 'why does', 'can you', 'is it', 'best'];
  const clusters: any = { how: [], what: [], why: [], can: [], is: [], best: [] };

  await Promise.all(
    questionWords.map(async q => {
      const results = await getGoogleAutocomplete(`${q} ${topic}`);
      const key = q.split(' ')[0];
      if (clusters[key]) {
        clusters[key] = results.filter(r => r.length > 10).slice(0, 6);
      }
    })
  );

  let total = 0;
  Object.values(clusters).forEach((arr: any) => total += arr.length);

  return {
    topic,
    totalQuestions: total,
    questionClusters: clusters
  };
}

export function clusterKeywords(
  keywords: string[],
  similarityThreshold = 0.6
): {
  totalKeywords: number;
  clusterCount: number;
  clusters: KeywordClusterGroup[];
} {
  const clusters: KeywordClusterGroup[] = [];
  const assigned = new Set<string>();

  keywords.forEach(kw => {
    if (assigned.has(kw)) return;

    const words = kw.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const related: string[] = [];

    keywords.forEach(other => {
      if (other === kw || assigned.has(other)) return;
      const otherWords = other.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      // Jaccard similarity between words
      const intersection = words.filter(w => otherWords.includes(w)).length;
      const union = new Set([...words, ...otherWords]).size;
      const sim = union > 0 ? intersection / union : 0;

      if (sim >= similarityThreshold || (words.length > 1 && other.toLowerCase().includes(words[0]))) {
        related.push(other);
      }
    });

    assigned.add(kw);
    related.forEach(r => assigned.add(r));

    const pillar = kw;
    const slug = pillar.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    clusters.push({
      clusterName: `${pillar} Topic Hub`,
      pillarTopic: pillar,
      primaryKeyword: pillar,
      supportingKeywords: related,
      recommendedArticleType: related.length > 2 ? 'Pillar Guide with Cluster Subpages' : 'Standalone Target Article',
      recommendedUrlSlug: `/${slug}`
    });
  });

  return {
    totalKeywords: keywords.length,
    clusterCount: clusters.length,
    clusters: clusters.sort((a, b) => b.supportingKeywords.length - a.supportingKeywords.length)
  };
}

export function classifySearchIntent(keywords: string[]): SearchIntentClassification[] {
  return keywords.map(kw => {
    const lower = kw.toLowerCase();

    let intent: SearchIntentClassification['intent'] = 'Informational';
    let confidence = 0.85;
    let format = 'In-depth Tutorial / Guide / Explanation';

    if (/\b(buy|order|discount|coupon|deal|pricing|price|cost|shop|purchase)\b/i.test(lower)) {
      intent = 'Transactional';
      confidence = 0.95;
      format = 'Product / Checkout / Pricing Page with direct Buy CTAs';
    } else if (/\b(best|top|review|reviews|vs|versus|comparison|alternative|alternatives)\b/i.test(lower)) {
      intent = 'Commercial Investigation';
      confidence = 0.92;
      format = 'Comparison Matrix / Roundup Review Table with pros & cons';
    } else if (/\b(login|sign in|portal|official|app|account|status)\b/i.test(lower)) {
      intent = 'Navigational';
      confidence = 0.90;
      format = 'Landing Page / Direct Portal Link';
    }

    return {
      keyword: kw,
      intent,
      confidenceScore: confidence,
      recommendedPageFormat: format
    };
  });
}
