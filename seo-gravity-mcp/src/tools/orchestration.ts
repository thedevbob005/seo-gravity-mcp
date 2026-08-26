import * as fs from 'fs';
import * as path from 'path';
import {
  ProjectAuditResult,
  DiagnosticResult,
  PrioritizedSprint,
  ProjectSnapshot,
  RegressionReport,
  Finding,
  FindingCategory
} from '../types/findings.js';
import { detectFramework, discoverRoutes, mapUrlToRouteSource } from '../utils/projectScanner.js';
import {
  createProjectSnapshot,
  compareSnapshots
} from '../utils/snapshotEngine.js';
import {
  generateCodeFixSnippet,
  calculateMultiDimensionalScores
} from '../utils/findingEngine.js';
import { fetchAndParsePage } from '../utils/scraper.js';

export async function auditProject(
  projectPath: string,
  baseUrl?: string,
  crawlDepth = 2
): Promise<ProjectAuditResult> {
  const snapshot = await createProjectSnapshot(projectPath, {
    baseUrl,
    maxCrawlDepth: crawlDepth,
    includeCrawlGraph: true
  });

  const findingsByCategory: Record<FindingCategory, number> = {
    technical: 0,
    content: 0,
    discoverability: 0,
    authority: 0,
    entity: 0,
    performance: 0,
    ai_readiness: 0
  };

  for (const f of snapshot.findings) {
    findingsByCategory[f.category] = (findingsByCategory[f.category] || 0) + 1;
  }

  // Sort by priorityScore descending
  const sortedFindings = [...snapshot.findings].sort((a, b) => b.priorityScore - a.priorityScore);

  const missingMetaCount = snapshot.discoveredRoutes.filter(
    r => r.routeType === 'page' && !r.hasMetadataExport && !r.hasGenerateMetadata
  ).length;

  const missingSchemaCount = snapshot.discoveredRoutes.filter(
    r => r.routeType === 'page' && !r.hasSchemaMarkup
  ).length;

  let recommendedAction = 'Project SEO health is strong. No critical blockers detected.';
  if (sortedFindings.length > 0) {
    const top = sortedFindings[0];
    recommendedAction = `Immediate Priority: Fix '${top.title}' in ${top.sourceLocation?.filePath || top.affectedUrl} (Priority Score: ${top.priorityScore}).`;
  }

  return {
    schemaVersion: 'seo.gravity/v1',
    projectPath: snapshot.projectPath,
    scannedAt: snapshot.createdAt,
    framework: snapshot.frameworkInfo,
    routesSummary: {
      totalDiscovered: snapshot.discoveredRoutes.length,
      dynamicRoutesCount: snapshot.discoveredRoutes.filter(r => r.isDynamic).length,
      routesMissingMetadata: missingMetaCount,
      routesMissingSchema: missingSchemaCount
    },
    scores: snapshot.scores,
    topPriorityFindings: sortedFindings.slice(0, 10),
    totalFindingsCount: snapshot.findings.length,
    findingsByCategory,
    crawlGraphSummary: snapshot.crawlGraph
      ? {
          totalPagesCrawled: snapshot.crawlGraph.totalNodes,
          orphanPagesDetected: snapshot.crawlGraph.orphanPages,
          hubPagesDetected: snapshot.crawlGraph.hubPages,
          deepPagesOver3Clicks: snapshot.crawlGraph.nodes
            .filter(n => n.clickDepth > 3)
            .map(n => n.url)
        }
      : undefined,
    recommendedImmediateAction: recommendedAction
  };
}

export async function diagnoseSeo(
  projectPath: string,
  targetUrlOrFile: string,
  focusIssueId?: string
): Promise<DiagnosticResult> {
  const resolvedPath = path.resolve(projectPath);
  const frameworkInfo = detectFramework(resolvedPath);
  const discoveredRoutes = discoverRoutes(resolvedPath, frameworkInfo);
  const mapping = mapUrlToRouteSource(targetUrlOrFile, discoveredRoutes);

  let sourceFile = mapping.sourceFilePath;
  if (!sourceFile && fs.existsSync(path.join(resolvedPath, targetUrlOrFile))) {
    sourceFile = targetUrlOrFile;
  }

  const detectedIssues: Finding[] = [];
  const rootCauses: DiagnosticResult['likelyRootCauses'] = [];
  const fixBlueprints: DiagnosticResult['suggestedFixBlueprints'] = [];

  let fileContent = '';
  if (sourceFile) {
    try {
      fileContent = fs.readFileSync(path.join(resolvedPath, sourceFile), 'utf-8');
    } catch {
      // File read failed
    }
  }

  // Next.js App Router diagnostics
  if (frameworkInfo.framework === 'nextjs-app-router' && sourceFile) {
    const hasMeta = /export\s+const\s+metadata\b/.test(fileContent);
    const hasGenMeta = /export\s+(async\s+)?function\s+generateMetadata\b/.test(fileContent);
    const hasCanonical = /canonical/.test(fileContent);
    const hasSchema = /application\/ld\+json/.test(fileContent);

    if (!hasMeta && !hasGenMeta) {
      const issueId = 'SEO-METATAG-001';
      detectedIssues.push({
        id: issueId,
        category: 'content',
        title: 'Missing Page Metadata Export',
        severity: 'high',
        confidence: 1.0,
        evidenceType: 'observed',
        evidence: `File '${sourceFile}' contains no 'metadata' or 'generateMetadata' export.`,
        affectedUrl: targetUrlOrFile,
        sourceLocation: { filePath: sourceFile, line: 1 },
        likelyRootCause: 'Next.js App Router relies on explicit metadata exports to generate <title> and <meta> tags.',
        recommendation: 'Export a Metadata object or dynamic generateMetadata function.',
        expectedImpact: 'Generates proper search snippet title and description.',
        effort: 'low',
        priorityScore: 18.5,
        priorityTier: 'critical',
        reliabilityState: 'FAIL',
        verification: {
          method: 'Inspect rendered HTML <head> for <title> and <meta name="description"> tags.',
          expectedOutcome: 'Valid title and description present in server-rendered HTML.'
        }
      });

      rootCauses.push({
        issueId,
        description: 'Missing Next.js metadata export in page component.',
        sourceCodeSnippet: fileContent.slice(0, 150),
        whyItOccurs: 'Without metadata export, Next.js falls back to empty root title, causing generic SERP snippets.'
      });

      fixBlueprints.push({
        issueId,
        title: 'Add static metadata export',
        targetFile: sourceFile,
        actionType: 'modify_file',
        codeToInsertOrReplace: `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n  title: 'Descriptive Page Title | Brand',\n  description: 'High-converting search meta description under 155 characters.',\n};\n`,
        verificationInstructions: 'Run `npm run build` to ensure type-check passes, then curl page and inspect <head>.'
      });
    }

    if (!hasCanonical) {
      const issueId = 'SEO-CANONICAL-001';
      detectedIssues.push({
        id: issueId,
        category: 'technical',
        title: 'Missing Canonical URL Declaration',
        severity: 'medium',
        confidence: 0.95,
        evidenceType: 'observed',
        evidence: `File '${sourceFile}' does not declare alternates.canonical.`,
        affectedUrl: targetUrlOrFile,
        sourceLocation: { filePath: sourceFile },
        likelyRootCause: 'Page does not declare its canonical master URL, risking duplicate content indexation.',
        recommendation: 'Add alternates.canonical to page metadata.',
        expectedImpact: 'Consolidates ranking signals onto the primary URL.',
        effort: 'low',
        priorityScore: 9.0,
        priorityTier: 'high',
        reliabilityState: 'WARNING',
        verification: {
          method: 'Inspect HTML for <link rel="canonical"> tag.',
          expectedOutcome: 'Canonical tag points to intended URL path.'
        }
      });

      fixBlueprints.push({
        issueId,
        title: 'Add canonical tag to metadata',
        targetFile: sourceFile,
        actionType: 'modify_file',
        codeToInsertOrReplace: `alternates: {\n  canonical: 'https://yourdomain.com${mapping.matchedRoute?.routePath || ''}',\n},`,
        verificationInstructions: 'Verify <link rel="canonical"> in server response.'
      });
    }
  }

  return {
    schemaVersion: 'seo.gravity/v1',
    targetUrlOrFile,
    matchedRoute: mapping.matchedRoute,
    sourceLocation: sourceFile ? { filePath: sourceFile, line: 1 } : undefined,
    detectedIssues,
    likelyRootCauses: rootCauses,
    suggestedFixBlueprints: fixBlueprints
  };
}

export async function prioritizeFindings(
  findingsOrProjectPath: Finding[] | string,
  maxCount = 20
): Promise<PrioritizedSprint> {
  let findingsList: Finding[] = [];

  if (typeof findingsOrProjectPath === 'string') {
    const snapshot = await createProjectSnapshot(findingsOrProjectPath);
    findingsList = snapshot.findings;
  } else {
    findingsList = findingsOrProjectPath;
  }

  const quickWins: Finding[] = [];
  const criticalBlockers: Finding[] = [];
  const architecturalImprovements: Finding[] = [];
  const minorPolish: Finding[] = [];

  for (const f of findingsList) {
    if (f.severity === 'critical' || (f.severity === 'high' && f.effort !== 'high')) {
      criticalBlockers.push(f);
    } else if ((f.effort === 'trivial' || f.effort === 'low') && (f.severity === 'high' || f.severity === 'medium')) {
      quickWins.push(f);
    } else if (f.effort === 'medium' || f.effort === 'high') {
      architecturalImprovements.push(f);
    } else {
      minorPolish.push(f);
    }
  }

  // Sort each sprint by priorityScore descending
  quickWins.sort((a, b) => b.priorityScore - a.priorityScore);
  criticalBlockers.sort((a, b) => b.priorityScore - a.priorityScore);
  architecturalImprovements.sort((a, b) => b.priorityScore - a.priorityScore);
  minorPolish.sort((a, b) => b.priorityScore - a.priorityScore);

  const initialScores = calculateMultiDimensionalScores(findingsList);
  const currentScore = initialScores.overallHealth;

  // Estimate post quick-wins score
  const remainingAfterQuickWins = findingsList.filter(f => !quickWins.includes(f));
  const scoreAfterQuickWins = calculateMultiDimensionalScores(remainingAfterQuickWins).overallHealth;

  const totalEffortHours =
    quickWins.length * 0.25 +
    criticalBlockers.length * 0.75 +
    architecturalImprovements.length * 2.0 +
    minorPolish.length * 0.1;

  return {
    schemaVersion: 'seo.gravity/v1',
    generatedAt: new Date().toISOString(),
    totalFindings: findingsList.length,
    sprints: {
      quickWins: quickWins.slice(0, maxCount),
      criticalBlockers: criticalBlockers.slice(0, maxCount),
      architecturalImprovements: architecturalImprovements.slice(0, maxCount),
      minorPolish: minorPolish.slice(0, maxCount)
    },
    estimatedTotalEffortHours: Math.round(totalEffortHours * 10) / 10,
    projectedScoreImprovement: {
      currentScore,
      projectedScoreAfterQuickWins: Math.min(100, scoreAfterQuickWins),
      projectedScoreAfterAll: 100
    }
  };
}

export async function generateFixPlan(
  projectPath: string,
  findingIds?: string[]
): Promise<{
  schemaVersion: 'seo.gravity/v1';
  projectPath: string;
  totalSteps: number;
  steps: Array<{
    stepNumber: number;
    issueId: string;
    action: string;
    targetFile: string;
    codeSnippet?: string;
    verificationMethod: string;
  }>;
  verificationChecklist: string[];
}> {
  const snapshot = await createProjectSnapshot(projectPath);
  const targetFindings = findingIds && findingIds.length > 0
    ? snapshot.findings.filter(f => findingIds.includes(f.id))
    : snapshot.findings.sort((a, b) => b.priorityScore - a.priorityScore);

  const steps: any[] = [];
  let stepNum = 1;

  for (const f of targetFindings) {
    const targetFile = f.sourceLocation?.filePath || (f.suggestedFix?.filePath || 'project file');
    steps.push({
      stepNumber: stepNum++,
      issueId: f.id,
      action: f.recommendation,
      targetFile,
      codeSnippet: f.suggestedFix?.snippet,
      verificationMethod: f.verification.method
    });
  }

  return {
    schemaVersion: 'seo.gravity/v1',
    projectPath: snapshot.projectPath,
    totalSteps: steps.length,
    steps,
    verificationChecklist: [
      '1. Apply code modifications to target files.',
      '2. Run `npm run build` or project build script to ensure no syntax/type errors.',
      '3. Execute `seo_regression_check` against the baseline snapshot to verify 0 regressions.'
    ]
  };
}

export async function createSnapshotTool(
  projectPath: string,
  baseUrl?: string,
  outputPath?: string
): Promise<{
  snapshot: ProjectSnapshot;
  savedToPath?: string;
}> {
  const snapshot = await createProjectSnapshot(projectPath, { baseUrl });

  let savedToPath: string | undefined;
  if (outputPath) {
    const absOut = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, JSON.stringify(snapshot, null, 2), 'utf-8');
    savedToPath = absOut;
  }

  return {
    snapshot,
    savedToPath
  };
}

export async function compareSnapshotsTool(
  baselineSnapshot: ProjectSnapshot | string,
  currentSnapshot: ProjectSnapshot | string
): Promise<RegressionReport> {
  const parseSnap = (input: ProjectSnapshot | string): ProjectSnapshot => {
    if (typeof input === 'string') {
      if (fs.existsSync(input)) {
        return JSON.parse(fs.readFileSync(input, 'utf-8'));
      }
      return JSON.parse(input);
    }
    return input;
  };

  const b = parseSnap(baselineSnapshot);
  const c = parseSnap(currentSnapshot);

  return compareSnapshots(b, c);
}

export async function checkRegression(
  projectPath: string,
  baselineSnapshot: ProjectSnapshot | string,
  baseUrl?: string
): Promise<{
  schemaVersion: 'seo.gravity/v1';
  pass: boolean;
  verdict: string;
  regressionReport: RegressionReport;
}> {
  const currentSnapshot = await createProjectSnapshot(projectPath, { baseUrl });
  const report = await compareSnapshotsTool(baselineSnapshot, currentSnapshot);

  const hasCriticalRegressions = report.newRegressions.some(
    r => r.severity === 'critical' || r.severity === 'high'
  );

  const pass = !hasCriticalRegressions && report.status !== 'REGRESSION_DETECTED';
  const verdict = pass
    ? '✅ PASSED: No critical SEO regressions detected.'
    : `🚨 FAILED: ${report.newRegressions.length} new SEO regression(s) detected.`;

  return {
    schemaVersion: 'seo.gravity/v1',
    pass,
    verdict,
    regressionReport: report
  };
}
