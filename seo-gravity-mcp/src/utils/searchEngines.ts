import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent } from './scraper.js';
import { SerpResultItem, SerpAnalysisResponse, ForumDiscussionsPulse } from '../types/seo.js';

/**
 * Fetches Google Autocomplete suggestions for a query.
 */
export async function getGoogleAutocomplete(query: string, language = 'en', country = 'us'): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&hl=${language}&gl=${country}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent()
      },
      timeout: 8000
    });

    if (Array.isArray(response.data) && Array.isArray(response.data[1])) {
      return response.data[1] as string[];
    }
    return [];
  } catch (err: any) {
    return [];
  }
}

/**
 * Generates Alphabet Soup suggestions (query + a, query + b, etc.)
 */
export async function getAlphabetSoupSuggestions(query: string): Promise<Record<string, string[]>> {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const results: Record<string, string[]> = {};

  // Batch query a subset of letters to be fast and respectful
  const sampleLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'm', 'p', 's', 't', 'v', 'w'];
  
  await Promise.all(
    sampleLetters.map(async letter => {
      const suggestions = await getGoogleAutocomplete(`${query} ${letter}`);
      if (suggestions.length > 0) {
        results[letter] = suggestions.slice(0, 5);
      }
    })
  );

  return results;
}

/**
 * Scrapes live Google SERP results with resilient fallback parsers.
 */
export async function scrapeGoogleSerp(
  query: string,
  country = 'us',
  language = 'en',
  numResults = 10
): Promise<SerpAnalysisResponse> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://www.google.com/search?q=${encodedQuery}&hl=${language}&gl=${country}&num=${Math.min(numResults + 5, 20)}`;

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': `${language}-${country.toUpperCase()},${language};q=0.9`,
        'Cache-Control': 'max-age=0'
      },
      timeout: 12000,
      validateStatus: () => true
    });

    const $ = cheerio.load(response.data);
    const organicResults: SerpResultItem[] = [];
    const peopleAlsoAsk: string[] = [];
    const relatedSearches: string[] = [];
    const serpFeaturesDetected: string[] = [];

    // Check for Featured Snippet
    if ($('.kp-blk, .c2xzTb, .g .xpdopen, [data-attrid="wa:/description"]').length > 0) {
      serpFeaturesDetected.push('Featured Snippet');
    }
    // Check for Video Carousel
    if ($('g-scrolling-carousel, [data-initq]').length > 0 || response.data.includes('video-preview')) {
      serpFeaturesDetected.push('Video Carousel / Clips');
    }
    // Check for Knowledge Panel
    if ($('[data-attrid="subtitle"], .kno-ecr-pt').length > 0) {
      serpFeaturesDetected.push('Knowledge Panel');
    }

    // Extract People Also Ask (PAA)
    $('[data-q], .cb7Thc, .JlqpRe, .match-mod-horizontalPadding').each((_, el) => {
      const q = $(el).attr('data-q') || $(el).text();
      const cleanQ = q.trim();
      if (cleanQ && cleanQ.endsWith('?') && !peopleAlsoAsk.includes(cleanQ) && cleanQ.length > 10) {
        peopleAlsoAsk.push(cleanQ);
      }
    });

    // Extract Related Searches
    $('a.k820Pd, .s75Bam a, .BNeawe.deIvCb a, .nVcaUb a').each((_, el) => {
      const rel = $(el).text().trim();
      if (rel && !relatedSearches.includes(rel) && rel.length > 2) {
        relatedSearches.push(rel);
      }
    });

    // Extract Organic Results across Google DOM variations
    let rank = 1;
    $('div.g, div.MjjYud').each((_, el) => {
      const titleEl = $(el).find('h3').first();
      const linkEl = $(el).find('a[href^="http"]').first();
      const snippetEl = $(el).find('div.VwiC3b, div[style*="-webkit-line-clamp"], .yXK7lf').first();

      const title = titleEl.text().trim();
      const url = linkEl.attr('href')?.trim();
      const snippet = snippetEl.text().trim();

      if (title && url && !url.includes('google.com') && !organicResults.some(r => r.url === url)) {
        organicResults.push({
          rank: rank++,
          title,
          url,
          snippet,
          isFeaturedSnippet: rank === 2 && serpFeaturesDetected.includes('Featured Snippet')
        });
      }
      if (organicResults.length >= numResults) return false;
    });

    // If Google blocked direct HTML or formatted differently, return clean empty organic array
    if (organicResults.length === 0) {
      const autoSuggestions = await getGoogleAutocomplete(query, language, country);
      return {
        query,
        organicResults: [],
        peopleAlsoAsk: autoSuggestions.filter(s => /^(what|how|why|is|can|best)/i.test(s)).slice(0, 5),
        relatedSearches: autoSuggestions.slice(0, 8),
        serpFeaturesDetected: ['Degraded / Rate-Limited']
      };
    }

    return {
      query,
      organicResults,
      peopleAlsoAsk: peopleAlsoAsk.slice(0, 8),
      relatedSearches: relatedSearches.slice(0, 10),
      serpFeaturesDetected
    };
  } catch (err: any) {
    const suggestions = await getGoogleAutocomplete(query, language, country);
    return {
      query,
      organicResults: [],
      peopleAlsoAsk: [],
      relatedSearches: suggestions.slice(0, 8),
      serpFeaturesDetected: ['Network Offline / Degraded']
    };
  }
}

/**
 * Discovers Reddit and Forum discussions ranking on Google for a query.
 */
export async function scrapeForumDiscussions(topic: string): Promise<ForumDiscussionsPulse> {
  const redditSerp = await scrapeGoogleSerp(`site:reddit.com ${topic}`);
  const quoraSerp = await scrapeGoogleSerp(`site:quora.com ${topic}`);

  const rankingDiscussions: ForumDiscussionsPulse['rankingDiscussions'] = [];

  redditSerp.organicResults.slice(0, 4).forEach(r => {
    rankingDiscussions.push({
      platform: 'Reddit',
      title: r.title.replace(/\s*:\s*r\/[a-zA-Z0-9_-]+/i, '').replace(/\s*-\s*Reddit/i, ''),
      url: r.url,
      snippet: r.snippet
    });
  });

  quoraSerp.organicResults.slice(0, 3).forEach(r => {
    rankingDiscussions.push({
      platform: 'Quora',
      title: r.title.replace(/\s*-\s*Quora/i, ''),
      url: r.url,
      snippet: r.snippet
    });
  });

  if (rankingDiscussions.length === 0) {
    return {
      topic,
      rankingDiscussions: [],
      extractedThemes: [],
      frequentUserPainPoints: [],
      consensusRecommendations: []
    };
  }

  // Derive extracted themes dynamically from actual retrieved discussion titles
  const extractedThemes: string[] = rankingDiscussions
    .map(d => d.title.trim())
    .filter(t => t.length > 5)
    .slice(0, 5);

  const painPoints: string[] = rankingDiscussions
    .map(d => d.snippet)
    .filter(s => s.length > 15)
    .slice(0, 3);

  const recommendations: string[] = [
    `Address user discussion topics: ${extractedThemes.slice(0, 2).join('; ')}`,
    `Incorporate direct answers to forum questions in content FAQ sections.`
  ];

  return {
    topic,
    rankingDiscussions,
    extractedThemes,
    frequentUserPainPoints: painPoints,
    consensusRecommendations: recommendations
  };
}
