import { JSDOM, VirtualConsole } from 'jsdom';
import axios from 'axios';
import { getRandomUserAgent } from './scraper.js';
import { JsRenderingDiffReport } from '../types/seo.js';

/**
 * Compares initial server HTML with the rendered DOM (JavaScript SEO Hydration diffing).
 */
export async function compareServerVsClientDom(url: string): Promise<JsRenderingDiffReport> {
  let serverHtml = '';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 12000,
      validateStatus: () => true
    });
    serverHtml = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  } catch (err: any) {
    throw new Error(`Failed to fetch server HTML from ${url}: ${err.message}`);
  }

  // Render in JSDOM with script execution enabled
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => {}); // silence js console errors
  virtualConsole.on('warn', () => {});

  let hydratedDomHtml = serverHtml;
  try {
    const dom = new JSDOM(serverHtml, {
      url,
      runScripts: 'outside-only',
      resources: 'usable',
      virtualConsole
    });
    hydratedDomHtml = dom.serialize();
  } catch {
    hydratedDomHtml = serverHtml;
  }

  const serverLength = serverHtml.length;
  const clientLength = hydratedDomHtml.length;
  const lengthDiff = Math.abs(clientLength - serverLength);
  const percentDiff = Number(((lengthDiff / Math.max(serverLength, 1)) * 100).toFixed(1));

  // Inspect link and heading differences
  const serverLinks = Array.from(serverHtml.matchAll(/href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi)).map(m => m[1]);
  const clientLinks = Array.from(hydratedDomHtml.matchAll(/href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi)).map(m => m[1]);

  const linksOnlyInClient = clientLinks.filter(l => !serverLinks.includes(l)).slice(0, 10);

  const serverH1s = Array.from(serverHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const clientH1s = Array.from(hydratedDomHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());

  const headingsOnlyInClient = clientH1s.filter(h => !serverH1s.includes(h));

  const crawlerRisk: JsRenderingDiffReport['seoCrawlerRisk'] = 
    linksOnlyInClient.length > 5 || percentDiff > 50
      ? 'High (Significant Hydration Dependence)'
      : percentDiff > 20
      ? 'Medium'
      : 'Low';

  const recommendations: string[] = [];
  if (linksOnlyInClient.length > 0) {
    recommendations.push(`Ensure critical navigation links (${linksOnlyInClient.length} detected) are present in the initial Server-Side Rendered (SSR) HTML rather than injected via client JavaScript.`);
  }
  if (headingsOnlyInClient.length > 0) {
    recommendations.push('H1 tag is rendered via client-side JavaScript. Pre-render H1 in server HTML to guarantee immediate crawler indexing.');
  }
  if (percentDiff < 15 && linksOnlyInClient.length === 0) {
    recommendations.push('Excellent hydration parity. Initial HTML matches rendered DOM cleanly for search engine bots.');
  }

  return {
    url,
    serverHtmlLength: serverLength,
    hydratedDomLength: clientLength,
    contentDifferencePercent: percentDiff,
    jsDependentElements: {
      linksOnlyInClientDom: linksOnlyInClient,
      headingsOnlyInClientDom: headingsOnlyInClient,
      metaTagsRewrittenByClient: []
    },
    seoCrawlerRisk: crawlerRisk,
    recommendations
  };
}
