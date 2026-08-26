import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DiscoveredRoute, Finding } from '../types/findings.js';
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
  } catch (err) {
    // A failed requested diff is not equivalent to a dirty-worktree query. Fall back
    // only for the conventional local-development baseline and make that behavior explicit.
    if (baseRef !== 'HEAD~1') throw new Error(`Unable to compute Git diff from '${baseRef}'.`);
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
      throw new Error(`Unable to determine Git changes in '${projectDir}'.`);
    }
  }
}

export function analyzeSemanticFileChange(filePath: string, projectDir: string): SemanticChangeCategory {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fullPath = path.resolve(projectDir, normalizedPath);
  const projectRoot = path.resolve(projectDir);
  if (fullPath !== projectRoot && !fullPath.startsWith(projectRoot + path.sep)) {
    throw new Error(`Changed file '${filePath}' resolves outside the project root.`);
  }

  if (!fs.existsSync(fullPath)) {
    // Deleted files need a conservative classification. We can reliably identify
    // route/config categories from the path, but should not claim every invariant is affected.
    const base = path.basename(normalizedPath).toLowerCase();
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
    return {
      affectsMetadata: false,
      affectsCanonical: false,
      affectsSchema: false,
      affectsLinks: false,
      affectsRobotsOrSitemap: false,
      likelyAffectedInvariants: [],
      riskLevel: 'LOW'
    };
  }

  const base = path.basename(normalizedPath).toLowerCase();
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

  const affectedInvariants: InvariantType[] = [];
  if (affectsMetadata) affectedInvariants.push('INV-TITLE-PRESENT');
  if (affectsCanonical) affectedInvariants.push('INV-CANONICAL-RESOLVES');
  if (affectsLinks) affectedInvariants.push('INV-LINK-ACCESSIBLE');

  // A file can only affect HTTP status if it plausibly participates in routing/runtime
  // behavior. Generic content/style files are not automatically treated as HTTP-risky.
  if (affectsMetadata || affectsCanonical || affectsLinks || /route|page|server|middleware|controller/i.test(base)) {
    affectedInvariants.unshift('INV-HTTP-200');
  }

  const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = (affectsCanonical || affectsMetadata) ? 'HIGH' : affectsLinks ? 'MEDIUM' : 'LOW';

  return {
    affectsMetadata,
    affectsCanonical,
    affectsSchema,
    affectsLinks,
    affectsRobotsOrSitemap: false,
    likelyAffectedInvariants: [...new Set(affectedInvariants)],
    riskLevel
  };
}

export function mapChangedFilesToRoutes(
  changedFiles: string[],
  routes: DiscoveredRoute[]
): { affected: DiscoveredRoute[]; unaffected: DiscoveredRoute[] } {
  const normalizedChanged = changedFiles.map(f => f.replace(/\\/g, '/'));
  const affected: DiscoveredRoute[] = [];
  const unaffected: DiscoveredRoute[] = [];

  const isGlobalFile = normalizedChanged.some(f => {
    const base = path.basename(f).toLowerCase();
    return base.startsWith('layout.') ||
      base.startsWith('sitemap.') ||
      base.startsWith('robots.') ||
      base === 'package.json' ||
      base.startsWith('next.config') ||
      base.startsWith('astro.config');
  });

  for (const r of routes) {
    const routeSource = r.sourceFilePath.replace(/\\/g, '/');
    if (isGlobalFile || normalizedChanged.includes(routeSource)) {
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
    const normalizedFile = file.replace(/\\/g, '/');
    const matchingRoute = routes.find(r => r.sourceFilePath.replace(/\\/g, '/') === normalizedFile);
    semanticDiffs.push({
      changedFile: normalizedFile,
      affectedRoute: matchingRoute?.routePath,
      semanticCategory: sem,
      impactDescription: `File change triggers risk [${sem.riskLevel}] on invariants: ${sem.likelyAffectedInvariants.join(', ') || 'none detected'}`
    });
  }

  const snapshot = await createProjectSnapshot(resolved, { baseUrl });
  const targetedFindings = snapshot.findings.filter(f =>
    affected.some(r => r.routePath === f.affectedUrl || f.sourceLocation?.filePath?.replace(/\\/g, '/') === r.sourceFilePath.replace(/\\/g, '/'))
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
