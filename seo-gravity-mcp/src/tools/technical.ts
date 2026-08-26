import axios from 'axios';
import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { fetchAndParsePage, getRandomUserAgent } from '../utils/scraper.js';
import { compareServerVsClientDom } from '../utils/jsdomRenderer.js';
import { TechnicalAuditReport, JsRenderingDiffReport } from '../types/seo.js';

export async function auditTechnical(url: string): Promise<TechnicalAuditReport> {
  const startTime = Date.now();
  const redirectChain: string[] = [];

  let response: any;
  try {
    response = await axios.get(url, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 15000,
      maxRedirects: 10,
      validateStatus: () => true
    });

    if (response.request?.res?.responseUrl && response.request.res.responseUrl !== url) {
      redirectChain.push(url, response.request.res.responseUrl);
    }
  } catch (err: any) {
    throw new Error(`Technical audit failed to connect to ${url}: ${err.message}`);
  }

  const responseTimeMs = Date.now() - startTime;
  const rawHtml = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  const $ = cheerio.load(rawHtml);

  // Canonical check
  const canonicalVal = $('link[rel="canonical"]').attr('href') || '';
  const isSelfRef = canonicalVal ? canonicalVal.replace(/\/$/, '') === url.replace(/\/$/, '') : false;

  // Robots meta
  const metaRobots = $('meta[name="robots"]').attr('content') || '';
  const xRobots = (response.headers['x-robots-tag'] as string) || '';
  const isNoIndex = /noindex/i.test(metaRobots) || /noindex/i.test(xRobots);
  const isNoFollow = /nofollow/i.test(metaRobots) || /nofollow/i.test(xRobots);

  // Hreflang
  const hreflangs: Array<{ lang: string; href: string }> = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr('hreflang') || '';
    const href = $(el).attr('href') || '';
    if (lang && href) hreflangs.push({ lang, href });
  });

  // OpenGraph & Twitter
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogType = $('meta[property="og:type"]').attr('content');

  const twCard = $('meta[name="twitter:card"]').attr('content');
  const twTitle = $('meta[name="twitter:title"]').attr('content');
  const twImage = $('meta[name="twitter:image"]').attr('content');

  const issues: TechnicalAuditReport['issuesFound'] = [];

  if (isNoIndex) {
    issues.push({
      severity: 'critical',
      message: 'Page has a NOINDEX directive, preventing Google from ranking it in search results.',
      fix: 'Remove "noindex" from <meta name="robots"> or X-Robots-Tag header before launching in production.'
    });
  }

  if (!canonicalVal) {
    issues.push({
      severity: 'warning',
      message: 'Missing canonical tag.',
      fix: `Add <link rel="canonical" href="${url}" /> to clarify the preferred master URL.`
    });
  }

  if (response.status >= 400) {
    issues.push({
      severity: 'critical',
      message: `HTTP Status Code is ${response.status} (Error).`,
      fix: 'Ensure server returns HTTP 200 OK for valid pages.'
    });
  }

  if (responseTimeMs > 1800) {
    issues.push({
      severity: 'warning',
      message: `Slow Server Response Time: ${responseTimeMs}ms (TTFB is over 1.8s).`,
      fix: 'Enable edge caching, optimize database queries, or use a CDN to bring TTFB under 800ms.'
    });
  }

  if (!url.startsWith('https://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    issues.push({
      severity: 'critical',
      message: 'Page is served over unencrypted HTTP rather than HTTPS.',
      fix: 'Enforce SSL/TLS certificate and 301 redirect all HTTP traffic to HTTPS.'
    });
  }

  return {
    url,
    statusCode: response.status,
    responseTimeMs,
    redirectChain,
    isHttps: url.startsWith('https://'),
    canonicalTag: {
      present: Boolean(canonicalVal),
      value: canonicalVal,
      isSelfReferencing: isSelfRef
    },
    robotsDirectives: {
      metaRobots,
      xRobotsTag: xRobots,
      isNoIndex,
      isNoFollow
    },
    hreflangTags: hreflangs,
    openGraphTags: {
      hasTitle: Boolean(ogTitle),
      hasDescription: Boolean(ogDesc),
      hasImage: Boolean(ogImage),
      hasType: Boolean(ogType)
    },
    twitterCards: {
      hasCard: Boolean(twCard),
      hasTitle: Boolean(twTitle),
      hasImage: Boolean(twImage)
    },
    issuesFound: issues
  };
}

export async function diffJsRendering(url: string): Promise<JsRenderingDiffReport> {
  return await compareServerVsClientDom(url);
}

export async function validateRobotsTxt(
  domainOrUrl: string,
  testPath = '/',
  userAgent = 'Googlebot'
): Promise<{
  domain: string;
  testPath: string;
  userAgent: string;
  accessStatus: 'ALLOWED' | 'DISALLOWED';
  matchedDirective: string;
  sitemapsFound: string[];
  rawDirectivesSample: string[];
}> {
  const domain = domainOrUrl.startsWith('http') ? new URL(domainOrUrl).origin : `https://${domainOrUrl}`;
  const robotsUrl = `${domain}/robots.txt`;

  let content = '';
  try {
    const res = await axios.get(robotsUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 8000
    });
    content = res.data;
  } catch {
    return {
      domain,
      testPath,
      userAgent,
      accessStatus: 'ALLOWED',
      matchedDirective: 'No robots.txt found (default ALLOWED)',
      sitemapsFound: [],
      rawDirectivesSample: []
    };
  }

  const sitemaps: string[] = [];
  const lines = content.split('\n').map(l => l.trim());
  let currentAgent = '';
  let matchedDirective = 'None (Default Allow)';
  let isDisallowed = false;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('sitemap:')) {
      sitemaps.push(line.substring(8).trim());
    }

    if (line.toLowerCase().startsWith('user-agent:')) {
      currentAgent = line.substring(11).trim();
    }

    if (currentAgent === '*' || currentAgent.toLowerCase() === userAgent.toLowerCase()) {
      if (line.toLowerCase().startsWith('disallow:')) {
        const pathRule = line.substring(9).trim();
        if (pathRule && testPath.startsWith(pathRule)) {
          isDisallowed = true;
          matchedDirective = `User-agent: ${currentAgent} -> Disallow: ${pathRule}`;
        }
      }
      if (line.toLowerCase().startsWith('allow:')) {
        const pathRule = line.substring(6).trim();
        if (pathRule && testPath.startsWith(pathRule)) {
          isDisallowed = false;
          matchedDirective = `User-agent: ${currentAgent} -> Allow: ${pathRule}`;
        }
      }
    }
  }

  return {
    domain,
    testPath,
    userAgent,
    accessStatus: isDisallowed ? 'DISALLOWED' : 'ALLOWED',
    matchedDirective,
    sitemapsFound: sitemaps,
    rawDirectivesSample: lines.slice(0, 15)
  };
}

export async function inspectSitemap(sitemapUrl: string): Promise<{
  sitemapUrl: string;
  isIndex: boolean;
  totalUrls: number;
  sampleUrls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>;
  errorsDetected: string[];
}> {
  let xmlData = '';
  try {
    const res = await axios.get(sitemapUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 12000
    });
    xmlData = res.data;
  } catch (err: any) {
    throw new Error(`Failed to download sitemap from ${sitemapUrl}: ${err.message}`);
  }

  const parser = new XMLParser();
  const jsonObj = parser.parse(xmlData);

  const errors: string[] = [];
  let isIndex = false;
  let totalUrls = 0;
  const sample: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];

  if (jsonObj.sitemapindex && jsonObj.sitemapindex.sitemap) {
    isIndex = true;
    const subMaps = Array.isArray(jsonObj.sitemapindex.sitemap) ? jsonObj.sitemapindex.sitemap : [jsonObj.sitemapindex.sitemap];
    totalUrls = subMaps.length;
    subMaps.slice(0, 10).forEach((s: any) => {
      sample.push({ loc: s.loc, lastmod: s.lastmod });
    });
  } else if (jsonObj.urlset && jsonObj.urlset.url) {
    const urls = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];
    totalUrls = urls.length;
    urls.slice(0, 10).forEach((u: any) => {
      sample.push({
        loc: u.loc,
        lastmod: u.lastmod,
        changefreq: u.changefreq,
        priority: u.priority
      });
    });

    if (totalUrls > 50000) {
      errors.push(`Sitemap contains ${totalUrls} URLs, exceeding Google's single-sitemap limit of 50,000 URLs. Break into a Sitemap Index.`);
    }
  } else {
    errors.push('Unrecognized XML sitemap format. Missing <urlset> or <sitemapindex> root node.');
  }

  return {
    sitemapUrl,
    isIndex,
    totalUrls,
    sampleUrls: sample,
    errorsDetected: errors
  };
}

export async function analyzeInternalLinks(url: string, maxCrawlDepth = 2): Promise<{
  targetUrl: string;
  totalInternalLinksFound: number;
  uniqueInternalDestinations: number;
  genericAnchorTextCount: number;
  topAnchorTexts: Array<{ anchor: string; count: number }>;
  nofollowInternalLinks: string[];
  recommendations: string[];
}> {
  const page = await fetchAndParsePage(url);
  const $ = page.$;
  const domain = url.startsWith('http') ? new URL(url).hostname : '';

  const anchorCounts = new Map<string, number>();
  const internalDestinations = new Set<string>();
  const nofollowLinks: string[] = [];
  let genericCount = 0;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || '';
    const anchor = $(el).text().trim();
    const rel = $(el).attr('rel') || '';

    if (href.startsWith('/') || (domain && href.includes(domain))) {
      internalDestinations.add(href);

      if (['click here', 'read more', 'learn more', 'here', 'link'].includes(anchor.toLowerCase())) {
        genericCount++;
      }

      if (anchor) {
        anchorCounts.set(anchor, (anchorCounts.get(anchor) || 0) + 1);
      }

      if (rel.includes('nofollow')) {
        nofollowLinks.push(href);
      }
    }
  });

  const topAnchors = Array.from(anchorCounts.entries())
    .map(([anchor, count]) => ({ anchor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recommendations: string[] = [];
  if (genericCount > 0) {
    recommendations.push(`Replace ${genericCount} generic anchor texts ("click here", "read more") with descriptive keyword-rich anchors.`);
  }
  if (nofollowLinks.length > 0) {
    recommendations.push(`Detected ${nofollowLinks.length} internal links marked with "nofollow". Avoid nofollowing internal links to preserve PageRank flow.`);
  }

  return {
    targetUrl: url,
    totalInternalLinksFound: page.links.internal.length,
    uniqueInternalDestinations: internalDestinations.size,
    genericAnchorTextCount: genericCount,
    topAnchorTexts: topAnchors,
    nofollowInternalLinks: nofollowLinks.slice(0, 5),
    recommendations
  };
}
