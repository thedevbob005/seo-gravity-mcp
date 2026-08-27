import './polyfill.js';
import { JSDOM, VirtualConsole } from 'jsdom';
import axios from 'axios';
import { getRandomUserAgent } from './scraper.js';
import { JsRenderingDiffReport } from '../types/seo.js';

/**
 * Compares initial server HTML with a normalized JSDOM parse.
 * This is a static DOM comparison; it does not execute application JavaScript.
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

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => {});
  virtualConsole.on('warn', () => {});

  let normalizedDomHtml = serverHtml;
  try {
    const dom = new JSDOM(serverHtml, {
      url,
      runScripts: 'outside-only',
      resources: 'usable',
      virtualConsole
    });
    normalizedDomHtml = dom.serialize();
  } catch {
    normalizedDomHtml = serverHtml;
  }

  const serverLength = serverHtml.length;
  const clientLength = normalizedDomHtml.length;
  const lengthDiff = Math.abs(clientLength - serverLength);
  const percentDiff = Number(((lengthDiff / Math.max(serverLength, 1)) * 100).toFixed(1));

  const serverLinks = Array.from(serverHtml.matchAll(/href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi)).map(m => m[1]);
  const clientLinks = Array.from(normalizedDomHtml.matchAll(/href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi)).map(m => m[1]);
  const linksOnlyInClient = clientLinks.filter(l => !serverLinks.includes(l)).slice(0, 10);

  const serverH1s = Array.from(serverHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const clientH1s = Array.from(normalizedDomHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const headingsOnlyInClient = clientH1s.filter(h => !serverH1s.includes(h));

  const crawlerRisk: JsRenderingDiffReport['seoCrawlerRisk'] =
    linksOnlyInClient.length > 5 || percentDiff > 50
      ? 'High (Significant Hydration Dependence)'
      : percentDiff > 20
        ? 'Medium'
        : 'Low';

  const recommendations: string[] = [];
  if (percentDiff < 15 && linksOnlyInClient.length === 0 && headingsOnlyInClient.length === 0) {
    recommendations.push('Static DOM normalization shows strong parity. This does not execute client JavaScript.');
  } else {
    recommendations.push('This result reflects static DOM normalization only; use a real browser runtime to test post-JavaScript hydration behavior.');
  }

  return {
    url,
    executionMode: 'static_dom_normalization',
    domParser: 'jsdom_html_parser',
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
