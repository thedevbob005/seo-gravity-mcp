import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

export function getRandomUserAgent(): string {
  const custom = process.env.SEO_USER_AGENT;
  if (custom) return custom;
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export interface InternalLinkDetail {
  href: string;
  anchorText: string;
  rel: string[];
}

export interface FetchedPageContent {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  html: string;
  $: cheerio.CheerioAPI;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  cleanText: string;
  wordCount: number;
  links: {
    internal: string[];
    external: string[];
    internalDetails: InternalLinkDetail[];
  };
  images: Array<{
    src: string;
    alt: string;
  }>;
  schemas: any[];
}

export async function fetchAndParsePage(input: string, baseOrigin?: string): Promise<FetchedPageContent> {
  let html = '';
  let url = input;
  let statusCode = 200;
  let headers: Record<string, string> = {};

  if (input.trim().startsWith('<') && input.includes('>')) {
    html = input;
    url = baseOrigin || 'raw-html-input';
  } else if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    html = fs.readFileSync(input, 'utf-8');
    url = `file://${path.resolve(input).replace(/\\/g, '/')}`;
  } else {
    try {
      const response = await axios.get(input, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true
      });

      statusCode = response.status;
      headers = response.headers as Record<string, string>;
      html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err: any) {
      throw new Error(`Failed to fetch page content from '${input}': ${err.message}`);
    }
  }

  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim() || '';

  const headings = {
    h1: $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h2: $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h3: $('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h4: $('h4').map((_, el) => $(el).text().trim()).get().filter(Boolean),
  };

  const cloneBody = $('body').clone();
  cloneBody.find('script, style, noscript, nav, footer, iframe, svg').remove();
  const cleanText = cloneBody.text().replace(/\s+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const domain = url.startsWith('http') ? new URL(url).hostname.toLowerCase() : '';
  const internal: string[] = [];
  const external: string[] = [];
  const internalDetails: InternalLinkDetail[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const anchorText = $(el).text().replace(/\s+/g, ' ').trim();
    const rel = ($(el).attr('rel') || '').split(/\s+/).map(v => v.trim()).filter(Boolean);

    try {
      if (href.startsWith('/')) {
        internal.push(href);
        internalDetails.push({ href, anchorText, rel });
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        const parsed = new URL(href);
        if (domain && parsed.hostname.toLowerCase() === domain) {
          internal.push(parsed.pathname + parsed.search);
          internalDetails.push({ href, anchorText, rel });
        } else {
          external.push(href);
        }
      } else if (!href.includes(':')) {
        internal.push('/' + href.replace(/^\.?\//, ''));
        internalDetails.push({ href, anchorText, rel });
      }
    } catch {
      // Ignore malformed URLs.
    }
  });

  const images: Array<{ src: string; alt: string }> = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = $(el).attr('alt') || '';
    images.push({ src, alt });
  });

  const schemas: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).html();
      if (text) schemas.push(JSON.parse(text));
    } catch {
      // Preserve the page result; invalid JSON-LD is handled by schema analysis.
    }
  });

  return {
    url,
    statusCode,
    headers,
    html,
    $,
    title,
    metaDescription,
    headings,
    cleanText,
    wordCount,
    links: { internal, external, internalDetails },
    images,
    schemas
  };
}
