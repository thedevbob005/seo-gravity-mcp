import {
  CrawlGraphNode,
  CrawlGraphEdge,
  CrawlGraphSummary
} from '../types/findings.js';
import { fetchAndParsePage, InternalLinkDetail } from './scraper.js';
import { normalizeUrl } from './urlNormalizer.js';

export interface CrawlGraphOptions {
  maxDepth?: number;
  maxPages?: number;
  knownRoutePaths?: string[];
  baseOrigin?: string;
}

export class CrawlGraphBuilder {
  private nodesMap = new Map<string, CrawlGraphNode>();
  private edges: CrawlGraphEdge[] = [];
  private visited = new Set<string>();

  constructor(private startUrl: string, private options: CrawlGraphOptions = {}) {}

  public async buildGraph(): Promise<CrawlGraphSummary> {
    const maxDepth = this.options.maxDepth ?? 3;
    const maxPages = this.options.maxPages ?? 50;
    const queue: Array<{ url: string; depth: number }> = [{ url: this.startUrl, depth: 0 }];

    let origin = this.options.baseOrigin || '';
    try {
      if (this.startUrl.startsWith('http')) {
        origin = new URL(this.startUrl).origin;
      }
    } catch {
      // Keep explicitly supplied baseOrigin, otherwise operate on relative paths.
    }

    this.ensureNode(this.startUrl, 0);

    // Known routes are deliberately seeded as crawl candidates. Their depth is unknown
    // until an actual internal link is observed, but we still crawl them so they can be
    // evaluated rather than being mistaken for observed orphan nodes.
    if (this.options.knownRoutePaths && origin) {
      for (const route of this.options.knownRoutePaths) {
        const fullUrl = `${origin}${route.startsWith('/') ? route : '/' + route}`;
        const norm = normalizeUrl(fullUrl);
        if (norm !== normalizeUrl(this.startUrl) && !this.visited.has(norm)) {
          this.ensureNode(norm, -1);
          queue.push({ url: norm, depth: 1 });
        }
      }
    }

    while (queue.length > 0 && this.visited.size < maxPages) {
      const current = queue.shift()!;
      const normUrl = normalizeUrl(current.url);

      if (this.visited.has(normUrl)) continue;
      this.visited.add(normUrl);

      const node = this.ensureNode(normUrl, current.depth);
      if (node.clickDepth === -1 || current.depth < node.clickDepth) {
        node.clickDepth = current.depth;
      }

      if (current.depth >= maxDepth) continue;

      try {
        const parsed = await fetchAndParsePage(normUrl, origin);
        node.title = parsed.title;
        node.statusCode = parsed.statusCode;

        const pageDomain = origin || (normUrl.startsWith('http') ? new URL(normUrl).origin : '');
        const internalDetails = parsed.links.internalDetails || parsed.links.internal.map(href => ({
          href,
          anchorText: href,
          rel: [] as string[]
        }));

        for (const detail of internalDetails) {
          const targetUrl = resolveInternalUrl(detail.href, pageDomain, normUrl);
          if (!targetUrl) continue;

          const normTarget = normalizeUrl(targetUrl);
          const anchorText = detail.anchorText.trim();
          const rel = detail.rel.map(value => value.toLowerCase());

          this.edges.push({
            sourceUrl: normUrl,
            targetUrl: normTarget,
            anchorText,
            isNofollow: rel.includes('nofollow'),
            isGenericAnchor: isGenericAnchorText(anchorText)
          });

          const targetNode = this.ensureNode(normTarget, current.depth + 1);
          if (targetNode.clickDepth === -1 || targetNode.clickDepth > current.depth + 1) {
            targetNode.clickDepth = current.depth + 1;
          }

          if (!this.visited.has(normTarget) && current.depth + 1 <= maxDepth) {
            queue.push({ url: normTarget, depth: current.depth + 1 });
          }
        }
      } catch {
        node.statusCode = 500;
      }
    }

    for (const edge of this.edges) {
      const src = this.nodesMap.get(edge.sourceUrl);
      const tgt = this.nodesMap.get(edge.targetUrl);
      if (src) src.outgoingLinksCount++;
      if (tgt) tgt.incomingLinksCount++;
    }

    this.computePageRank();

    const orphanPages: string[] = [];
    const hubPages: string[] = [];
    const deadEnds: string[] = [];

    for (const [url, node] of this.nodesMap.entries()) {
      // Only evaluated/visited nodes can be classified. Unobserved known routes are not
      // treated as orphans until they have been crawled.
      if (this.visited.has(url) && node.incomingLinksCount === 0 && url !== normalizeUrl(this.startUrl)) {
        node.isOrphan = true;
        orphanPages.push(url);
      }

      if (node.outgoingLinksCount >= 5) {
        node.isHubPage = true;
        hubPages.push(url);
      }

      if (this.visited.has(url) && node.outgoingLinksCount === 0) {
        node.isDeadEnd = true;
        deadEnds.push(url);
      }
    }

    const nodesList = Array.from(this.nodesMap.values());
    const maxClickDepth = Math.max(0, ...nodesList.map(n => (n.clickDepth === -1 ? 0 : n.clickDepth)));

    return {
      totalNodes: nodesList.length,
      totalEdges: this.edges.length,
      maxClickDepth,
      orphanPages,
      hubPages,
      deadEnds,
      circularLoops: this.findSimpleCycles(),
      nodes: nodesList,
      edges: this.edges
    };
  }

  private ensureNode(url: string, depth: number): CrawlGraphNode {
    const norm = normalizeUrl(url);
    if (!this.nodesMap.has(norm)) {
      this.nodesMap.set(norm, {
        url: norm,
        title: norm,
        statusCode: 200,
        clickDepth: depth,
        incomingLinksCount: 0,
        outgoingLinksCount: 0,
        pageRankScore: 1.0,
        isOrphan: false,
        isDeadEnd: false,
        isHubPage: false
      });
    }
    return this.nodesMap.get(norm)!;
  }

  private computePageRank(iterations = 20, damping = 0.85): void {
    const nodes = Array.from(this.nodesMap.keys());
    const N = nodes.length;
    if (N === 0) return;

    let pr: Record<string, number> = {};
    for (const u of nodes) pr[u] = 1 / N;

    const incomingMap = new Map<string, string[]>();
    for (const u of nodes) incomingMap.set(u, []);
    for (const edge of this.edges) {
      const arr = incomingMap.get(edge.targetUrl);
      if (arr && !arr.includes(edge.sourceUrl)) arr.push(edge.sourceUrl);
    }

    for (let iter = 0; iter < iterations; iter++) {
      const nextPr: Record<string, number> = {};
      for (const u of nodes) {
        let sum = 0;
        const incomingSources = incomingMap.get(u) || [];
        for (const src of incomingSources) {
          const srcNode = this.nodesMap.get(src);
          const outDegree = srcNode && srcNode.outgoingLinksCount > 0 ? srcNode.outgoingLinksCount : 1;
          sum += (pr[src] || 0) / outDegree;
        }
        nextPr[u] = (1 - damping) / N + damping * sum;
      }
      pr = nextPr;
    }

    const maxPr = Math.max(...Object.values(pr), 0.0001);
    for (const u of nodes) {
      const node = this.nodesMap.get(u);
      if (node) node.pageRankScore = Math.round(((pr[u] || 0) / maxPr) * 100) / 100;
    }
  }

  private findSimpleCycles(): Array<{ cycle: string[] }> {
    const cycles: Array<{ cycle: string[] }> = [];
    const directPairs = new Set<string>();

    for (const edge of this.edges) {
      const reverseKey = `${edge.targetUrl}->${edge.sourceUrl}`;
      if (directPairs.has(reverseKey)) {
        cycles.push({ cycle: [edge.sourceUrl, edge.targetUrl, edge.sourceUrl] });
      }
      directPairs.add(`${edge.sourceUrl}->${edge.targetUrl}`);
    }

    return cycles.slice(0, 5);
  }
}

function resolveInternalUrl(href: string, origin: string, currentUrl: string): string | null {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return null;
  }

  try {
    const base = currentUrl.startsWith('http')
      ? currentUrl
      : origin
        ? `${origin}${currentUrl.startsWith('/') ? currentUrl : '/' + currentUrl}`
        : `http://localhost${currentUrl.startsWith('/') ? currentUrl : '/' + currentUrl}`;
    const resolved = new URL(href, base);

    if (origin && resolved.origin !== origin) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function isGenericAnchorText(text: string): boolean {
  const genericWords = ['click here', 'read more', 'learn more', 'view', 'link', 'here', 'more', 'details'];
  return genericWords.includes(text.toLowerCase().trim());
}
