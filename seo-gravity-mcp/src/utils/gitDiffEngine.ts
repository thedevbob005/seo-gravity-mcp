import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DiscoveredRoute, Finding, ProjectSnapshot } from '../types/findings.js';
import { getProjectAdapter } from './projectScanner.js';
import { createProjectSnapshot } from './snapshotEngine.js';
import { inspectSourceFileAST } from './astLocator.js';

export interface SemanticChangeCategory {
  affectsMetadata: boolean;
  affectsCanonical: boolean;
  affectsSchema: boolean;
  affectsLinks: boolean;
  affectsRobotsOrSitemap: boolean;
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
  targetedFindings: Finding[];
  regressionDetected: boolean;
  summary: string;
}

export function getChangedFilesSince(projectDir: string, baseRef = 'HEAD~1'): string[] {
  try {
    const output = execSync(`git diff --name-only ${baseRef}`, {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.split('\n').map(l => l.trim().replace(/\\/g, '/')).filter(Boolean);
  } catch {
    try {
      const status = execSync('git status --porcelain', {
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
      affectsRobotsOrSitemap: true
    };
  }

  const base = path.basename(filePath).toLowerCase();
  if (base.includes('sitemap') || base.includes('robots') || base.includes('llms')) {
    return {
      affectsMetadata: false,
      affectsCanonical: false,
      affectsSchema: false,
      affectsLinks: false,
      affectsRobotsOrSitemap: true
    };
  }

  const ast = inspectSourceFileAST(fullPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  return {
    affectsMetadata: ast.hasMetadataExport || ast.hasGenerateMetadata || /<title\b|<meta\s+name/i.test(content),
    affectsCanonical: ast.hasCanonicalDeclaration || /rel=["']canonical["']/i.test(content),
    affectsSchema: ast.hasSchemaMarkup || /application\/ld\+json/i.test(content),
    affectsLinks: /<Link\b|<a\b|href=/i.test(content),
    affectsRobotsOrSitemap: false
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
  for (const file of changedFiles) {
    semanticImpacts[file] = analyzeSemanticFileChange(file, resolved);
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
    targetedFindings,
    regressionDetected: hasCritical,
    summary: `Differential audit completed: ${changedFiles.length} file(s) changed, ${affected.length} route(s) affected, ${targetedFindings.length} targeted finding(s) detected.`
  };
}
