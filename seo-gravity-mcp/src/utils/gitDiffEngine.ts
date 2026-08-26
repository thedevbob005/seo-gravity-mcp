import { execSync } from 'child_process';
import * as path from 'path';
import { DiscoveredRoute, Finding, ProjectSnapshot } from '../types/findings.js';
import { getProjectAdapter } from './projectScanner.js';
import { createProjectSnapshot, compareSnapshots } from './snapshotEngine.js';

export interface DifferentialAuditResult {
  schemaVersion: 'seo.gravity/v1';
  projectPath: string;
  baseRef: string;
  headRef: string;
  changedFiles: string[];
  affectedRoutes: DiscoveredRoute[];
  unaffectedRoutesCount: number;
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
    // If diff against baseRef fails, check unstaged/staged working tree changes
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
    targetedFindings,
    regressionDetected: hasCritical,
    summary: `Differential audit completed: ${changedFiles.length} file(s) changed, ${affected.length} route(s) affected, ${targetedFindings.length} targeted finding(s) detected.`
  };
}
