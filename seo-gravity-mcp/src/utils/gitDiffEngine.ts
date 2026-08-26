import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DiscoveredRoute, Finding, ProjectSnapshot } from '../types/findings.js';
import { getProjectAdapter } from './projectScanner.js';
import { createProjectSnapshot } from './snapshotEngine.js';
import { inspectSourceFileAST } from './astLocator.js';
import { InvariantType } from '../types/canonical.js';

const SAFE_GIT_REF = /^[a-zA-Z0-9_.~^/@-]+$/;

export interface SemanticChangeCategory {
  affectsMetadata: boolean;
  affectsCanonical: boolean;
  affectsSchema: boolean;
  affectsLinks: boolean;
  affectsRobotsOrSitemap: boolean;
  likelyAffectedInvariants: InvariantType[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SemanticSeoDiff {
  changedFile: string;
  affectedRoute?: string;
  sourceRange?: { startLine: number; endLine: number };
  semanticCategory: SemanticChangeCategory;
  impactDescription: string;
}

export interface DifferentialAuditResult {
  schemaVersion: 'seo.gravity/v1';
  projectPath: string;
  baseRef: string;
  headRef: string;
  changedFiles: string[];
  affectedRoutes: DiscoveredRoute[];
  unaffectedRoutesCount: number;
  semanticImpacts: Record<string, SemanticChangeCategory>;
  semanticDiffs: SemanticSeoDiff[];
  targetedFindings: Finding[];
  regressionDetected: boolean;
  summary: string;
}

export function getChangedFilesSince(projectDir: string, baseRef = 'HEAD~1'): string[] {
  if (!SAFE_GIT_REF.test(baseRef)) {
    throw new Error(`Invalid Git ref format: '${baseRef}' contains unsafe characters.`);
  }

  try {
    const output = execFileSync('git', ['diff', '--name-only', baseRef], {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.split('\n').map(l => l.trim().replace(/\\/g, '/')).filter(Boolean);
  } catch {
    try {
      const status = execFileSync('git', ['status', '--porcelain'], {
        cwd: projectDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return status
        .split('\n')
        .map(l => l.slice(3).trim().replace(/\\/g, '/'))
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}

export function analyzeSemanticFileChange(filePath: string, projectDir: string): SemanticChangeCategory {
  const fullPath = path.join(projectDir, filePath);
  if (!fs.existsSync(fullPath)) {
    return {
      affectsMetadata: true,
      affectsCanonical: true,
      affectsSchema: true,
      affectsLinks: true,
      affectsRobotsOrSitemap: true,
      likelyAffectedInvariants: ['INV-HTTP-200', 'INV-CANONICAL-RESOLVES', 'INV-TITLE-PRESENT'],
      riskLevel: 'HIGH'
    };
  }

  const base = path.basename(filePath).toLowerCase();
  if (base.includes('sitemap') || base.includes('robots') || base.includes('llms')) {
    return {
      affectsMetadata: false,
      affectsCanonical: false,
      affectsSchema: false,
      affectsLinks: false,
      affectsRobotsOrSitemap: true,
      likelyAffectedInvariants: ['INV-ROBOTS-ALLOWED', 'INV-SITEMAP-PRESENT', 'INV-LLMS-TXT'],
      riskLevel: 'MEDIUM'
    };
  }

  const ast = inspectSourceFileAST(fullPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  const affectsMetadata = ast.hasMetadataExport || ast.hasGenerateMetadata || /<title\b|<meta\s+name|@section\(['"]title/i.test(content);
  const affectsCanonical = ast.hasCanonicalDeclaration || /rel=["']canonical["']/i.test(content);
  const affectsSchema = ast.hasSchemaMarkup || /application\/ld\+json/.test(content);
  const affectsLinks = /<Link\b|<a\b|href=/i.test(content);

  const affectedInvariants: InvariantType[] = ['INV-HTTP-200'];
  if (affectsMetadata) affectedInvariants.push('INV-TITLE-PRESENT');
  if (affectsCanonical) affectedInvariants.push('INV-CANONICAL-RESOLVES');
  if (affectsLinks) affectedInvariants.push('INV-LINK-ACCESSIBLE');

  const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = (affectsCanonical || affectsMetadata) ? 'HIGH' : affectsLinks ? 'MEDIUM' : 'LOW';

  return {
    affectsMetadata,
    affectsCanonical,
    affectsSchema,
    affectsLinks,
    affectsRobotsOrSitemap: false,
    likelyAffectedInvariants: affectedInvariants,
    riskLevel
  };
}

export function mapChangedFilesToRoutes(
  changedFiles: string[],
  routes: DiscoveredRoute[]
): { affected: DiscoveredRoute[]; unaffected: DiscoveredRoute[] } {
  const affected: DiscoveredRoute[] = [];
  const unaffected: DiscoveredRoute[] = [];

  const isGlobalFile = changedFiles.some(f =>
    f.includes('layout.') ||
    f.includes('sitemap.') ||
    f.includes('robots.') ||
    f.includes('package.json') ||
    f.includes('next.config') ||
    f.includes('astro.config')
  );

  for (const r of routes) {
    if (isGlobalFile || changedFiles.some(f => r.sourceFilePath.includes(f) || f.includes(r.sourceFilePath))) {
      affected.push(r);
    } else {
      unaffected.push(r);
    }
  }

  return { affected, unaffected };
}

export async function runDifferentialAudit(
  projectDir: string,
  baseRef = 'HEAD~1',
  baseUrl?: string
): Promise<DifferentialAuditResult> {
  const resolved = path.resolve(projectDir);
  const adapter = getProjectAdapter(resolved);
  const routes = adapter.discoverRoutes(resolved);
  const changedFiles = getChangedFilesSince(resolved, baseRef);
  const { affected, unaffected } = mapChangedFilesToRoutes(changedFiles, routes);

  const semanticImpacts: Record<string, SemanticChangeCategory> = {};
  const semanticDiffs: SemanticSeoDiff[] = [];

  for (const file of changedFiles) {
    const sem = analyzeSemanticFileChange(file, resolved);
    semanticImpacts[file] = sem;
    const matchingRoute = routes.find(r => r.sourceFilePath === file);
    semanticDiffs.push({
      changedFile: file,
      affectedRoute: matchingRoute?.routePath,
      semanticCategory: sem,
      impactDescription: `File change triggers risk [${sem.riskLevel}] on invariants: ${sem.likelyAffectedInvariants.join(', ')}`
    });
  }

  const snapshot = await createProjectSnapshot(resolved, { baseUrl });
  const targetedFindings = snapshot.findings.filter(f =>
    affected.some(r => r.routePath === f.affectedUrl || f.sourceLocation?.filePath === r.sourceFilePath)
  );

  const hasCritical = targetedFindings.some(f => f.severity === 'critical' || f.severity === 'high');

  return {
    schemaVersion: 'seo.gravity/v1',
    projectPath: resolved,
    baseRef,
    headRef: snapshot.gitMetadata?.shortHash || 'HEAD',
    changedFiles,
    affectedRoutes: affected,
    unaffectedRoutesCount: unaffected.length,
    semanticImpacts,
    semanticDiffs,
    targetedFindings,
    regressionDetected: hasCritical,
    summary: `Differential audit completed: ${changedFiles.length} file(s) changed, ${affected.length} route(s) affected, ${targetedFindings.length} targeted finding(s) detected.`
  };
}
