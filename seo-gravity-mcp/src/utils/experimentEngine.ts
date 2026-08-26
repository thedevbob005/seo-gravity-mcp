import { ProjectSnapshot } from '../types/findings.js';
import { createProjectSnapshot } from './snapshotEngine.js';
import * as path from 'path';

export interface SEOExperiment {
  id: string;
  createdAt: string;
  hypothesis: string;
  targetRoute: string;
  baselineHealthScore: number;
  baselineFindingsCount: number;
  proposedChange: string;
  verificationCriteria: {
    targetMetric: string;
    expectedOutcome: string;
  };
  status: 'DRAFT' | 'IN_PROGRESS' | 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE';
}

export interface ExperimentVerificationResult {
  schemaVersion: 'seo.gravity/v1';
  experimentId: string;
  status: 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE';
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  findingsResolvedCount: number;
  summary: string;
}

export async function planExperiment(
  projectPath: string,
  targetRoute: string,
  hypothesis: string,
  proposedChange: string
): Promise<SEOExperiment> {
  const resolved = path.resolve(projectPath);
  const baseline = await createProjectSnapshot(resolved);
  const routeFindings = baseline.findings.filter(f => f.affectedUrl === targetRoute);

  return {
    id: `exp_${Date.now()}`,
    createdAt: new Date().toISOString(),
    hypothesis,
    targetRoute,
    baselineHealthScore: baseline.scores.overallHealth,
    baselineFindingsCount: routeFindings.length,
    proposedChange,
    verificationCriteria: {
      targetMetric: 'Route SEO Health & Defect Resolution',
      expectedOutcome: 'Zero regressions and defect resolved.'
    },
    status: 'DRAFT'
  };
}

export async function verifyExperiment(
  projectPath: string,
  experiment: SEOExperiment
): Promise<ExperimentVerificationResult> {
  const resolved = path.resolve(projectPath);
  const current = await createProjectSnapshot(resolved);
  const scoreDelta = current.scores.overallHealth - experiment.baselineHealthScore;
  const currentRouteFindings = current.findings.filter(f => f.affectedUrl === experiment.targetRoute);
  const resolvedCount = Math.max(0, experiment.baselineFindingsCount - currentRouteFindings.length);

  const success = scoreDelta >= 0 && resolvedCount > 0;

  return {
    schemaVersion: 'seo.gravity/v1',
    experimentId: experiment.id,
    status: success ? 'VERIFIED_SUCCESS' : 'VERIFIED_FAILURE',
    baselineScore: experiment.baselineHealthScore,
    currentScore: current.scores.overallHealth,
    scoreDelta,
    findingsResolvedCount: resolvedCount,
    summary: success
      ? `✅ Experiment succeeded: ${resolvedCount} issue(s) resolved, score improved by +${scoreDelta} points.`
      : `❌ Experiment did not satisfy criteria: score delta is ${scoreDelta}, ${currentRouteFindings.length} issue(s) remain on '${experiment.targetRoute}'.`
  };
}
