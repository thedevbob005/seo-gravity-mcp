import {
  ProjectSnapshot,
  RegressionReport,
  Finding,
  MultiDimensionalScores
} from '../types/findings.js';
import { detectFramework, discoverRoutes, mapUrlToRouteSource } from './projectScanner.js';
import { CrawlGraphBuilder } from './crawlGraph.js';
import {
  createFinding,
  calculateMultiDimensionalScores,
  generateCodeFixSnippet
} from './findingEngine.js';
import { fetchAndParsePage } from './scraper.js';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateSnapshotOptions {
  baseUrl?: string;
  maxCrawlDepth?: number;
  maxPagesToAudit?: number;
  includeCrawlGraph?: boolean;
}

export async function createProjectSnapshot(
  projectPath: string,
  options: CreateSnapshotOptions = {}
): Promise<ProjectSnapshot> {
  const resolvedPath = path.resolve(projectPath);
  const frameworkInfo = detectFramework(resolvedPath);
  const discoveredRoutes = discoverRoutes(resolvedPath, frameworkInfo);
  const findings: Finding[] = [];

  const baseUrl = options.baseUrl || (frameworkInfo.defaultDevPort ? `http://localhost:${frameworkInfo.defaultDevPort}` : undefined);
  const maxPages = options.maxPagesToAudit || 15;

  // 1. Static SEO Architecture Checks
  if (!frameworkInfo.hasSitemapConfig) {
    findings.push(
      createFinding({
        id: 'SEO-SITEMAP-001',
        category: 'discoverability',
        title: 'Missing XML Sitemap',
        severity: 'high',
        confidence: 1.0,
        evidenceType: 'observed',
        evidence: 'No sitemap.xml or sitemap.ts detected in project root or app directory.',
        affectedUrl: '/sitemap.xml',
        sourceLocation: { filePath: frameworkInfo.framework.includes('nextjs') ? 'app/sitemap.ts' : 'public/sitemap.xml' },
        likelyRootCause: 'Project does not generate or publish an XML sitemap.',
        recommendation: 'Create a dynamic sitemap.ts (Next.js) or static public/sitemap.xml to index all public routes.',
        suggestedFix: {
          type: 'file_creation',
          filePath: frameworkInfo.framework.includes('nextjs') ? 'app/sitemap.ts' : 'public/sitemap.xml',
          explanation: 'Generate dynamic sitemap for search engines.'
        },
        expectedImpact: 'Ensures search engines discover all published URLs and fresh content.',
        effort: 'low',
        reach: 'site_wide'
      })
    );
  }

  if (!frameworkInfo.hasRobotsConfig) {
    findings.push(
      createFinding({
        id: 'SEO-ROBOTS-001',
        category: 'discoverability',
        title: 'Missing robots.txt',
        severity: 'high',
        confidence: 1.0,
        evidenceType: 'observed',
        evidence: 'No robots.txt or robots.ts configuration file detected.',
        affectedUrl: '/robots.txt',
        sourceLocation: { filePath: frameworkInfo.framework.includes('nextjs') ? 'app/robots.ts' : 'public/robots.txt' },
        likelyRootCause: 'Search bot crawler guidelines are undefined.',
        recommendation: 'Add robots.txt specifying crawl directives and pointing to sitemap.xml.',
        suggestedFix: generateCodeFixSnippet('SEO-ROBOTS-001', frameworkInfo.framework, {}),
        expectedImpact: 'Guides Googlebot and AI search crawlers to appropriate public pages.',
        effort: 'trivial',
        reach: 'site_wide'
      })
    );
  }

  if (!frameworkInfo.hasLlmsTxt) {
    findings.push(
      createFinding({
        id: 'SEO-LLMS-001',
        category: 'ai_readiness',
        title: 'Missing /llms.txt AI Context File',
        severity: 'medium',
        confidence: 0.95,
        evidenceType: 'observed',
        evidence: 'No /llms.txt or /llms-full.txt file found for generative AI search engines.',
        affectedUrl: '/llms.txt',
        sourceLocation: { filePath: 'public/llms.txt' },
        likelyRootCause: 'Site does not provide curated markdown summaries for AI LLM bots.',
        recommendation: 'Generate /llms.txt with key documentation and product landing page summaries.',
        suggestedFix: generateCodeFixSnippet('SEO-LLMS-001', frameworkInfo.framework, {}),
        expectedImpact: 'Improves entity citation accuracy in ChatGPT, Perplexity, and Google AI Overviews.',
        effort: 'trivial',
        reach: 'site_wide'
      })
    );
  }

  // 2. Inspect Discovered Routes for Missing Metadata & Schemas
  for (const route of discoveredRoutes) {
    if (route.routeType === 'page') {
      if (frameworkInfo.framework === 'nextjs-app-router') {
        if (!route.hasMetadataExport && !route.hasGenerateMetadata && !route.hasHeadComponent) {
          findings.push(
            createFinding({
              id: 'SEO-METATAG-001',
              category: 'content',
              title: `Missing Metadata in Route '${route.routePath}'`,
              severity: route.routePath === '/' ? 'critical' : 'high',
              confidence: 0.95,
              evidenceType: 'observed',
              evidence: `File '${route.sourceFilePath}' has no 'export const metadata' or 'generateMetadata()'.`,
              affectedUrl: route.routePath,
              sourceLocation: { filePath: route.sourceFilePath },
              likelyRootCause: 'Next.js App Router page does not declare SEO metadata export.',
              recommendation: `Add 'export const metadata: Metadata = { title: "...", description: "..." }' in ${route.sourceFilePath}.`,
              suggestedFix: generateCodeFixSnippet('SEO-TITLE-001', frameworkInfo.framework, {
                filePath: route.sourceFilePath
              }),
              expectedImpact: 'Provides search engines and social cards with proper title & description.',
              effort: 'low',
              reach: route.routePath === '/' ? 'multi_page' : 'single_page'
            })
          );
        }
      }

      if (!route.hasSchemaMarkup && (route.routePath.includes('blog') || route.routePath.includes('product') || route.routePath === '/')) {
        findings.push(
          createFinding({
            id: 'SEO-SCHEMA-001',
            category: 'entity',
            title: `Missing Structured Data (Schema.org) on '${route.routePath}'`,
            severity: 'medium',
            confidence: 0.85,
            evidenceType: 'heuristic',
            evidence: `Route '${route.routePath}' (${route.sourceFilePath}) lacks JSON-LD structured data markup.`,
            affectedUrl: route.routePath,
            sourceLocation: { filePath: route.sourceFilePath },
            likelyRootCause: 'Schema.org JSON-LD script not injected for core entity.',
            recommendation: 'Add schema markup (Article, Product, or Organization) to qualify for Google Rich Results.',
            suggestedFix: generateCodeFixSnippet('SEO-SCHEMA-001', frameworkInfo.framework, {
              filePath: route.sourceFilePath
            }),
            expectedImpact: 'Enhances SERP CTR with rich snippet stars, author badges, and FAQs.',
            effort: 'medium',
            reach: 'single_page'
          })
        );
      }
    }
  }

  // 3. Live or Localhost Crawl Inspection (if baseUrl available)
  let crawlGraphSummary: any;
  if (baseUrl) {
    try {
      const graphBuilder = new CrawlGraphBuilder(baseUrl, {
        maxDepth: options.maxCrawlDepth || 2,
        maxPages,
        knownRoutePaths: discoveredRoutes.map(r => r.routePath)
      });
      crawlGraphSummary = await graphBuilder.buildGraph();

      // Check for orphan pages
      if (crawlGraphSummary.orphanPages.length > 0) {
        for (const orphan of crawlGraphSummary.orphanPages.slice(0, 5)) {
          findings.push(
            createFinding({
              id: 'SEO-ORPHAN-001',
              category: 'discoverability',
              title: `Orphan Page Detected: '${orphan}'`,
              severity: 'medium',
              confidence: 0.9,
              evidenceType: 'derived',
              evidence: `Page '${orphan}' was discovered in routes/sitemap but has 0 internal incoming links.`,
              affectedUrl: orphan,
              likelyRootCause: 'Page is not linked from main navigation, footer, or parent category pages.',
              recommendation: 'Add contextual internal links pointing to this page to pass link equity.',
              expectedImpact: 'Allows search engine crawlers to discover and rank this page efficiently.',
              effort: 'low',
              reach: 'single_page'
            })
          );
        }
      }

      // Check for dead ends
      if (crawlGraphSummary.deadEnds.length > 0) {
        for (const deadEnd of crawlGraphSummary.deadEnds.slice(0, 3)) {
          findings.push(
            createFinding({
              id: 'SEO-DEADEND-001',
              category: 'discoverability',
              title: `Dead-End Page: '${deadEnd}'`,
              severity: 'low',
              confidence: 0.85,
              evidenceType: 'observed',
              evidence: `Page '${deadEnd}' has 0 outgoing internal links, trapping crawlers and users.`,
              affectedUrl: deadEnd,
              likelyRootCause: 'Page lacks footer links, breadcrumbs, or contextual next-step links.',
              recommendation: 'Include breadcrumbs or related articles links to sustain crawl flow.',
              expectedImpact: 'Improves user retention and search engine crawl budget circulation.',
              effort: 'trivial',
              reach: 'isolated'
            })
          );
        }
      }
    } catch {
      // Live crawl failed or server not running, continue with static findings
    }
  }

  // 4. Compute Multidimensional Scores
  const scores = calculateMultiDimensionalScores(findings, {
    discoveredRoutesCount: discoveredRoutes.length,
    hasSitemap: frameworkInfo.hasSitemapConfig,
    hasRobots: frameworkInfo.hasRobotsConfig,
    hasLlmsTxt: frameworkInfo.hasLlmsTxt
  });

  // 5. Generate Route Source Mappings
  const routeMappings = discoveredRoutes.map(r =>
    mapUrlToRouteSource(r.routePath, discoveredRoutes)
  );

  const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    schemaVersion: 'seo.gravity/v1',
    snapshotId,
    createdAt: new Date().toISOString(),
    projectPath: resolvedPath,
    frameworkInfo,
    discoveredRoutes,
    scores,
    findings,
    crawlGraph: crawlGraphSummary,
    routeMappings
  };
}

export function compareSnapshots(
  baseline: ProjectSnapshot,
  current: ProjectSnapshot
): RegressionReport {
  const baselineFindingMap = new Map<string, Finding>();
  for (const f of baseline.findings) {
    baselineFindingMap.set(`${f.id}:${f.affectedUrl}`, f);
  }

  const currentFindingMap = new Map<string, Finding>();
  for (const f of current.findings) {
    currentFindingMap.set(`${f.id}:${f.affectedUrl}`, f);
  }

  const resolvedFindings: Finding[] = [];
  const newRegressions: Finding[] = [];
  const unresolvedFindings: Finding[] = [];

  // Check resolved vs unresolved
  for (const [key, bFinding] of baselineFindingMap.entries()) {
    if (currentFindingMap.has(key)) {
      unresolvedFindings.push(currentFindingMap.get(key)!);
    } else {
      resolvedFindings.push(bFinding);
    }
  }

  // Check new regressions
  for (const [key, cFinding] of currentFindingMap.entries()) {
    if (!baselineFindingMap.has(key)) {
      newRegressions.push(cFinding);
    }
  }

  // Score deltas
  const scoreCategories: Array<keyof Omit<MultiDimensionalScores, 'overallHealth' | 'overallConfidence' | 'totalEvidenceSignals'>> = [
    'technical',
    'content',
    'discoverability',
    'authority',
    'entity',
    'performance',
    'aiReadiness'
  ];

  const scoreDeltas: any = {};
  for (const cat of scoreCategories) {
    const before = baseline.scores[cat].score;
    const after = current.scores[cat].score;
    const delta = after - before;
    scoreDeltas[cat] = {
      before,
      after,
      delta,
      state: delta > 0 ? 'improved' : delta < 0 ? 'regressed' : 'unchanged'
    };
  }

  const overallDelta = current.scores.overallHealth - baseline.scores.overallHealth;

  let status: RegressionReport['status'] = 'NO_REGRESSION';
  if (newRegressions.length > 0 && resolvedFindings.length > 0) {
    status = 'MIXED_CHANGES';
  } else if (newRegressions.length > 0) {
    status = 'REGRESSION_DETECTED';
  } else if (resolvedFindings.length > 0) {
    status = 'IMPROVEMENTS_ONLY';
  }

  const alerts: string[] = [];
  for (const reg of newRegressions) {
    if (reg.severity === 'critical' || reg.severity === 'high') {
      alerts.push(`🚨 [${reg.severity.toUpperCase()}] New regression: ${reg.title} (${reg.affectedUrl})`);
    }
  }

  for (const res of resolvedFindings) {
    alerts.push(`✅ Fixed: ${res.title} (${res.affectedUrl})`);
  }

  return {
    schemaVersion: 'seo.gravity/v1',
    baselineSnapshotId: baseline.snapshotId,
    currentSnapshotId: current.snapshotId,
    evaluatedAt: new Date().toISOString(),
    status,
    overallScoreDelta: overallDelta,
    scoreDeltas,
    resolvedFindings,
    newRegressions,
    unresolvedFindings,
    totalResolvedCount: resolvedFindings.length,
    totalNewRegressionsCount: newRegressions.length,
    alerts
  };
}
