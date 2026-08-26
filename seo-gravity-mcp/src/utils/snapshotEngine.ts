import {
  ProjectSnapshot,
  RegressionReport,
  Finding,
  MultiDimensionalScores,
  Observation,
  SEOInvariant,
  InvariantDiffItem,
  GitMetadata
} from '../types/findings.js';
import { getProjectAdapter, discoverRoutes, mapUrlToRouteSource } from './projectScanner.js';
import { CrawlGraphBuilder } from './crawlGraph.js';
import {
  createFinding,
  calculateMultiDimensionalScores,
  generateCodeFixSnippet
} from './findingEngine.js';
import { inspectSourceFileAST } from './astLocator.js';
import { defaultInvariantRegistry } from '../invariants/registry.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

export interface CreateSnapshotOptions {
  baseUrl?: string;
  maxCrawlDepth?: number;
  maxPagesToAudit?: number;
  includeCrawlGraph?: boolean;
}

export function computeLogicalPageId(urlOrPath: string): string {
  let clean = urlOrPath;
  let origin = 'default';
  try {
    if (clean.startsWith('http')) {
      const u = new URL(clean);
      origin = u.origin.toLowerCase();
      clean = u.pathname;
    }
  } catch {}
  clean = clean.replace(/\/$/, '') || '/';
  return 'page_' + crypto.createHash('sha256').update(`${origin}:${clean}`).digest('hex').substring(0, 12);
}

export function extractGitMetadata(projectDir: string): GitMetadata {
  try {
    const commitHash = execSync('git rev-parse HEAD', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const status = execSync('git status --porcelain', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const date = execSync('git log -1 --format=%cd', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const author = execSync('git log -1 --format=%an', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

    return {
      commitHash,
      shortHash: commitHash.slice(0, 7),
      branch,
      isDirty: status.length > 0,
      commitDate: date,
      author
    };
  } catch {
    return {
      isDirty: false
    };
  }
}

export async function createProjectSnapshot(
  projectPath: string,
  options: CreateSnapshotOptions = {}
): Promise<ProjectSnapshot> {
  const resolvedPath = path.resolve(projectPath);
  const adapter = getProjectAdapter(resolvedPath);
  const frameworkInfo = adapter.getProjectInfo(resolvedPath);
  const discoveredRoutes = adapter.discoverRoutes(resolvedPath);
  const gitMetadata = extractGitMetadata(resolvedPath);

  const findings: Finding[] = [];
  const observations: Observation[] = [];
  const invariants: SEOInvariant[] = [];

  const baseUrl = options.baseUrl || (frameworkInfo.defaultDevPort ? `http://localhost:${frameworkInfo.defaultDevPort}` : undefined);
  const maxPages = options.maxPagesToAudit || 15;
  const now = new Date().toISOString();

  // 1. Static SEO Architecture Checks
  const sitemapFile = adapter.findSitemapConfig(resolvedPath);
  const robotsFile = adapter.findRobotsConfig(resolvedPath);
  const llmsFile = adapter.findLlmsTxt(resolvedPath);

  observations.push({
    id: 'obs_sitemap',
    logicalPageId: 'site_root',
    observedUrl: '/sitemap.xml',
    key: 'sitemap_config',
    rawValue: sitemapFile,
    normalizedValue: Boolean(sitemapFile),
    provenance: {
      analyzer: adapter.id,
      source: 'sitemap_xml',
      timestamp: now,
      provider: 'filesystem'
    }
  });

  const robotsInv = defaultInvariantRegistry.evaluateContext(
    'INV-ROBOTS-ALLOWED',
    {
      url: '/robots.txt',
      logicalPageId: 'site_root',
      hasRobots: Boolean(robotsFile)
    },
    {
      analyzer: adapter.id,
      source: 'robots_txt',
      timestamp: now,
      provider: 'filesystem'
    }
  );
  if (robotsInv) invariants.push(robotsInv);

  const sitemapInv = defaultInvariantRegistry.evaluateContext(
    'INV-SITEMAP-PRESENT',
    {
      url: '/sitemap.xml',
      logicalPageId: 'site_root',
      hasSitemap: Boolean(sitemapFile)
    },
    {
      analyzer: adapter.id,
      source: 'sitemap_xml',
      timestamp: now,
      provider: 'filesystem'
    }
  );
  if (sitemapInv) invariants.push(sitemapInv);

  const llmsInv = defaultInvariantRegistry.evaluateContext(
    'INV-LLMS-TXT',
    {
      url: '/llms.txt',
      logicalPageId: 'site_root',
      hasLlmsTxt: Boolean(llmsFile)
    },
    {
      analyzer: adapter.id,
      source: 'static_analysis',
      timestamp: now,
      provider: 'filesystem'
    }
  );
  if (llmsInv) invariants.push(llmsInv);

  if (!sitemapFile) {
    findings.push(
      createFinding({
        id: 'SEO-SITEMAP-001',
        category: 'discoverability',
        title: 'Missing XML Sitemap',
        severity: 'high',
        confidence: 1.0,
        evidenceType: 'observed',
        evidence: 'No sitemap configuration file detected in project.',
        affectedUrl: '/sitemap.xml',
        sourceLocation: { filePath: frameworkInfo.framework.includes('nextjs') ? 'app/sitemap.ts' : 'public/sitemap.xml' },
        likelyRootCause: 'Project does not generate or publish an XML sitemap.',
        recommendation: 'Create a dynamic sitemap.ts or static public/sitemap.xml to index all public routes.',
        expectedImpact: 'Ensures search engines discover all published URLs.',
        effort: 'low',
        reach: 'site_wide'
      })
    );
  }

  if (!robotsFile) {
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
        recommendation: 'Add robots.txt specifying crawl directives.',
        suggestedFix: generateCodeFixSnippet('SEO-ROBOTS-001', frameworkInfo.framework, {}),
        expectedImpact: 'Guides search and AI crawlers to appropriate public pages.',
        effort: 'trivial',
        reach: 'site_wide'
      })
    );
  }

  if (!llmsFile) {
    findings.push(
      createFinding({
        id: 'SEO-LLMS-001',
        category: 'ai_readiness',
        title: 'Missing /llms.txt AI Context File',
        severity: 'medium',
        confidence: 0.95,
        evidenceType: 'observed',
        evidence: 'No /llms.txt or /llms-full.txt file found for AI search engines.',
        affectedUrl: '/llms.txt',
        sourceLocation: { filePath: 'public/llms.txt' },
        likelyRootCause: 'Site does not provide curated markdown summaries for AI LLM bots.',
        recommendation: 'Generate /llms.txt with key documentation and landing page summaries.',
        suggestedFix: generateCodeFixSnippet('SEO-LLMS-001', frameworkInfo.framework, {}),
        expectedImpact: 'Improves entity citation accuracy in ChatGPT, Perplexity, and Google AI Overviews.',
        effort: 'trivial',
        reach: 'site_wide'
      })
    );
  }

  // 2. Inspect Discovered Routes using Adapter & AST
  for (const route of discoveredRoutes) {
    if (route.routeType === 'page') {
      const pageId = computeLogicalPageId(route.routePath);
      const fullSrcPath = path.join(resolvedPath, route.sourceFilePath);
      const ast = inspectSourceFileAST(fullSrcPath);

      // Metadata invariant
      const hasMeta = ast.hasMetadataExport || ast.hasGenerateMetadata || route.hasHeadComponent;
      const titleInv = defaultInvariantRegistry.evaluateContext(
        'INV-TITLE-PRESENT',
        {
          url: route.routePath,
          logicalPageId: pageId,
          hasMetadata: hasMeta,
          extractedTitle: ast.extractedTitle
        },
        {
          analyzer: 'astLocator',
          source: 'ast_inspection',
          timestamp: now,
          provider: 'typescript_ast'
        }
      );
      if (titleInv) invariants.push(titleInv);

      // Canonical invariant
      const hasCanonical = ast.hasCanonicalDeclaration;
      const canonicalInv = defaultInvariantRegistry.evaluateContext(
        'INV-CANONICAL-RESOLVES',
        {
          url: route.routePath,
          logicalPageId: pageId,
          hasCanonical,
          extractedCanonical: ast.extractedCanonical
        },
        {
          analyzer: 'astLocator',
          source: 'ast_inspection',
          timestamp: now,
          provider: 'typescript_ast'
        }
      );
      if (canonicalInv) invariants.push(canonicalInv);

      // Check for missing metadata finding
      if (!hasMeta) {
        findings.push(
          createFinding({
            id: 'SEO-METATAG-001',
            category: 'content',
            title: `Missing Metadata in Route '${route.routePath}'`,
            severity: route.routePath === '/' ? 'critical' : 'high',
            confidence: 0.98,
            evidenceType: 'observed',
            evidence: `File '${route.sourceFilePath}' has no metadata declaration.`,
            affectedUrl: route.routePath,
            sourceLocation: {
              filePath: route.sourceFilePath,
              startLine: 1,
              endLine: 1
            },
            sourceRange: ast.metadataRange,
            likelyRootCause: 'Page component does not declare SEO metadata export.',
            recommendation: `Add metadata export or title tag in ${route.sourceFilePath}.`,
            suggestedFix: generateCodeFixSnippet('SEO-TITLE-001', frameworkInfo.framework, {
              filePath: route.sourceFilePath
            }),
            expectedImpact: 'Provides search engines with proper title & description.',
            effort: 'low',
            reach: route.routePath === '/' ? 'multi_page' : 'single_page'
          })
        );
      }

      // Check for missing canonical finding
      if (!hasCanonical && route.routePath !== '/sitemap.xml' && route.routePath !== '/robots.txt') {
        findings.push(
          createFinding({
            id: 'SEO-CANONICAL-001',
            category: 'technical',
            title: `Missing Canonical Tag on '${route.routePath}'`,
            severity: 'medium',
            confidence: 0.95,
            evidenceType: 'observed',
            evidence: `Route '${route.routePath}' (${route.sourceFilePath}) does not declare a canonical URL.`,
            affectedUrl: route.routePath,
            sourceLocation: { filePath: route.sourceFilePath },
            sourceRange: ast.canonicalRange,
            likelyRootCause: 'Page does not declare its canonical master URL, risking duplicate indexing.',
            recommendation: `Add canonical URL declaration to ${route.sourceFilePath}.`,
            suggestedFix: generateCodeFixSnippet('SEO-CANONICAL-001', frameworkInfo.framework, {
              filePath: route.sourceFilePath,
              canonicalUrl: `https://yourdomain.com${route.routePath}`
            }),
            expectedImpact: 'Consolidates ranking signals onto the primary URL.',
            effort: 'low',
            reach: 'single_page'
          })
        );
      }
    }
  }

  // 3. Crawl Graph
  let crawlGraphSummary: any;
  if (baseUrl) {
    try {
      const graphBuilder = new CrawlGraphBuilder(baseUrl, {
        maxDepth: options.maxCrawlDepth || 2,
        maxPages,
        knownRoutePaths: discoveredRoutes.map(r => r.routePath)
      });
      crawlGraphSummary = await graphBuilder.buildGraph();

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
              evidence: `Page '${orphan}' has 0 internal incoming links.`,
              affectedUrl: orphan,
              likelyRootCause: 'Page is unlinked from main navigation or parent category.',
              recommendation: 'Add internal links pointing to this page.',
              expectedImpact: 'Allows crawlers and users to reach this page.',
              effort: 'low',
              reach: 'single_page'
            })
          );
        }
      }
    } catch {}
  }

  // 4. Compute Multidimensional Scores
  const scores = calculateMultiDimensionalScores(findings, {
    discoveredRoutesCount: discoveredRoutes.length,
    hasSitemap: Boolean(sitemapFile),
    hasRobots: Boolean(robotsFile),
    hasLlmsTxt: Boolean(llmsFile)
  });

  const routeMappings = discoveredRoutes.map(r =>
    adapter.mapRouteToSource(r.routePath, discoveredRoutes)
  );

  const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    schemaVersion: 'seo.gravity/v1',
    snapshotId,
    createdAt: now,
    projectPath: resolvedPath,
    gitMetadata,
    frameworkInfo,
    discoveredRoutes,
    scores,
    findings,
    observations,
    invariants,
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

  for (const [key, bFinding] of baselineFindingMap.entries()) {
    if (currentFindingMap.has(key)) {
      unresolvedFindings.push(currentFindingMap.get(key)!);
    } else {
      resolvedFindings.push(bFinding);
    }
  }

  for (const [key, cFinding] of currentFindingMap.entries()) {
    if (!baselineFindingMap.has(key)) {
      newRegressions.push(cFinding);
    }
  }

  // Invariant-based diffing across Full Key Union (detects disappearing invariants)
  const invariantDiffs: InvariantDiffItem[] = [];
  const baselineInvariants = new Map<string, SEOInvariant>();
  for (const inv of baseline.invariants || []) {
    baselineInvariants.set(`${inv.id}:${inv.url}`, inv);
  }

  const currentInvariants = new Map<string, SEOInvariant>();
  for (const inv of current.invariants || []) {
    currentInvariants.set(`${inv.id}:${inv.url}`, inv);
  }

  const allInvariantKeys = new Set([
    ...baselineInvariants.keys(),
    ...currentInvariants.keys()
  ]);

  for (const key of allInvariantKeys) {
    const bInv = baselineInvariants.get(key);
    const cInv = currentInvariants.get(key);
    let status: InvariantDiffItem['status'] = 'UNCHANGED';

    if (bInv && cInv) {
      if (bInv.satisfied && !cInv.satisfied) {
        status = 'NEW_REGRESSION';
      } else if (!bInv.satisfied && cInv.satisfied) {
        status = 'RESOLVED';
      }
      invariantDiffs.push({
        invariantId: cInv.id,
        logicalPageId: cInv.logicalPageId,
        url: cInv.url,
        status,
        baselineSatisfied: bInv.satisfied,
        currentSatisfied: cInv.satisfied,
        requirementLevel: cInv.requirementLevel || 'REQUIRED',
        severity: cInv.severity || 'high',
        evidence: cInv.evidence,
        message: `${cInv.description}: ${status}`
      });
    } else if (cInv && !bInv) {
      status = cInv.satisfied ? 'UNCHANGED' : 'NEW_REGRESSION';
      invariantDiffs.push({
        invariantId: cInv.id,
        logicalPageId: cInv.logicalPageId,
        url: cInv.url,
        status,
        baselineSatisfied: false,
        currentSatisfied: cInv.satisfied,
        requirementLevel: cInv.requirementLevel || 'REQUIRED',
        severity: cInv.severity || 'high',
        evidence: cInv.evidence,
        message: `${cInv.description}: ${status}`
      });
    } else if (bInv && !cInv) {
      // Invariant disappeared in current snapshot!
      status = bInv.satisfied ? 'NEW_REGRESSION' : 'RESOLVED';
      invariantDiffs.push({
        invariantId: bInv.id,
        logicalPageId: bInv.logicalPageId,
        url: bInv.url,
        status,
        baselineSatisfied: bInv.satisfied,
        currentSatisfied: false,
        requirementLevel: bInv.requirementLevel || 'REQUIRED',
        severity: bInv.severity || 'high',
        evidence: bInv.evidence,
        message: `${bInv.description}: Invariant disappeared (${status})`
      });
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
    alerts.push(`🚨 [${reg.severity.toUpperCase()}] New regression: ${reg.title} (${reg.affectedUrl})`);
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
    invariantDiffs,
    totalResolvedCount: resolvedFindings.length,
    totalNewRegressionsCount: newRegressions.length,
    alerts
  };
}
