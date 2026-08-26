import {
  CrawlGraphNode,
  CrawlGraphEdge,
  CrawlGraphSummary
} from '../types/findings.js';
import { fetchAndParsePage } from './scraper.js';

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

    let origin = '';
    try {
      if (this.startUrl.startsWith('http')) {
        origin = new URL(this.startUrl).origin;
      }
    } catch {
      origin = this.options.baseOrigin || '';
    }

    // Initialize start node
    this.ensureNode(this.startUrl, 0);

    // Seed with known route paths if provided
    if (this.options.knownRoutePaths && origin) {
      for (const route of this.options.knownRoutePaths) {
        const fullUrl = `${origin}${route.startsWith('/') ? route : '/' + route}`;
        this.ensureNode(fullUrl, -1);
      }
    }

    while (queue.length > 0 && this.visited.size < maxPages) {
      const current = queue.shift()!;
      const normUrl = normalizeUrl(current.url);

      if (this.visited.has(normUrl)) continue;
      this.visited.add(normUrl);

      const node = this.ensureNode(normUrl, current.depth);

      // Don't crawl beyond maxDepth
      if (current.depth >= maxDepth) continue;

      try {
        const parsed = await fetchAndParsePage(normUrl, origin);
        node.title = parsed.title;
        node.statusCode = parsed.statusCode;

        const internalLinks = parsed.links.internal;
        const pageDomain = origin || (normUrl.startsWith('http') ? new URL(normUrl).origin : '');

        for (const rawTarget of internalLinks) {
          const targetUrl = resolveInternalUrl(rawTarget, pageDomain, normUrl);
          if (!targetUrl) continue;

          const normTarget = normalizeUrl(targetUrl);
          const isGeneric = isGenericAnchorText(rawTarget);

          this.edges.push({
            sourceUrl: normUrl,
            targetUrl: normTarget,
            anchorText: rawTarget,
            isNofollow: false,
            isGenericAnchor: isGeneric
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

    // Calculate In-degree and Out-degree
    for (const edge of this.edges) {
      const src = this.nodesMap.get(edge.sourceUrl);
      const tgt = this.nodesMap.get(edge.targetUrl);
      if (src) src.outgoingLinksCount++;
      if (tgt) tgt.incomingLinksCount++;
    }

    // Compute PageRank Heuristic
    this.computePageRank();

    // Identify Orphans, Hubs, and Dead-Ends
    const orphanPages: string[] = [];
    const hubPages: string[] = [];
    const deadEnds: string[] = [];

    for (const [url, node] of this.nodesMap.entries()) {
      // Orphan: page in graph with 0 incoming internal links (excluding the root starting URL)
      if (node.incomingLinksCount === 0 && url !== normalizeUrl(this.startUrl)) {
        node.isOrphan = true;
        orphanPages.push(url);
      }

      // Hub: 5 or more outgoing links
      if (node.outgoingLinksCount >= 5) {
        node.isHubPage = true;
        hubPages.push(url);
      }

      // Dead end: visited page with 0 outgoing links
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

    // Build incoming edge map
    const incomingMap = new Map<string, string[]>();
    for (const u of nodes) incomingMap.set(u, []);
    for (const edge of this.edges) {
      const arr = incomingMap.get(edge.targetUrl);
      if (arr && !arr.includes(edge.sourceUrl)) {
        arr.push(edge.sourceUrl);
      }
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

    // Normalize PageRank scores to 0.0 - 1.0
    const maxPr = Math.max(...Object.values(pr), 0.0001);
    for (const u of nodes) {
      const node = this.nodesMap.get(u);
      if (node) {
        node.pageRankScore = Math.round(((pr[u] || 0) / maxPr) * 100) / 100;
      }
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

function normalizeUrl(url: string): string {
  try {
    if (url.startsWith('http')) {
      const u = new URL(url);
      return `${u.origin}${u.pathname.replace(/\/$/, '') || '/'}`;
    }
  } catch {
    // Ignored
  }
  return url.replace(/\/$/, '') || '/';
}

function resolveInternalUrl(href: string, origin: string, currentUrl: string): string | null {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return null;
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    if (origin && href.startsWith(origin)) return href;
    return null;
  }

  if (href.startsWith('/')) {
    return origin ? `${origin}${href}` : href;
  }

  // Relative path
  try {
    const base = currentUrl.startsWith('http') ? currentUrl : `http://localhost${currentUrl}`;
    const resolved = new URL(href, base).pathname;
    return origin ? `${origin}${resolved}` : resolved;
  } catch {
    return href;
  }
}

function isGenericAnchorText(text: string): boolean {
  const genericWords = ['click here', 'read more', 'learn more', 'view', 'link', 'here', 'more', 'details'];
  return genericWords.includes(text.toLowerCase().trim());
}
