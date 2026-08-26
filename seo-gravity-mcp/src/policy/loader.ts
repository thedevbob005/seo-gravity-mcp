import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { z } from 'zod';
import { PolicyConfig, PolicyProfileName, InvariantPolicyOverride } from './types.js';
import { BUILTIN_PROFILES } from './profiles.js';
import { InvariantDiffItem, RequirementLevel } from '../types/canonical.js';

export const InvariantRuleSchema = z.object({
  enabled: z.boolean().optional(),
  requirementLevel: z.enum(['REQUIRED', 'CONDITIONAL', 'RECOMMENDED', 'OPTIONAL']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional()
});

export const RegressionPolicySchema = z.object({
  failOnLevels: z.array(z.enum(['REQUIRED', 'CONDITIONAL', 'RECOMMENDED', 'OPTIONAL'])).optional(),
  failOnSeverities: z.array(z.enum(['critical', 'high', 'medium', 'low', 'info'])).optional(),
  allowExpectedChanges: z.boolean().optional(),
  maxAllowedRegressions: z.number().int().min(0).optional()
});

export const PolicyConfigSchema = z.object({
  version: z.union([z.number(), z.string()]).optional(),
  profile: z.enum(['strict', 'balanced', 'startup', 'ecommerce', 'documentation', 'custom']).optional(),
  regression: RegressionPolicySchema.optional(),
  invariants: z.record(InvariantRuleSchema).optional(),
  policy: z.record(z.any()).optional(),
  framework: z.object({
    adapter: z.string().optional(),
    force: z.boolean().optional(),
    entrypoint: z.string().optional()
  }).optional()
});

export class PolicyLoader {
  public static resolvePolicy(projectDir: string = '.', explicitPath?: string): PolicyConfig {
    let rawConfig: any = null;

    if (explicitPath && fs.existsSync(explicitPath)) {
      rawConfig = this.parseConfigFile(explicitPath);
    } else {
      const candidates = [
        '.seo-gravity.json',
        'seo-gravity.config.json',
        '.seo-gravity.yml',
        '.seo-gravity.yaml'
      ];
      for (const c of candidates) {
        const full = path.join(projectDir, c);
        if (fs.existsSync(full)) {
          rawConfig = this.parseConfigFile(full);
          break;
        }
      }
    }

    const baseProfileName: PolicyProfileName = (rawConfig?.profile as PolicyProfileName) || 'balanced';
    const baseProfile = BUILTIN_PROFILES[baseProfileName] || BUILTIN_PROFILES.balanced;

    if (!rawConfig) {
      return baseProfile;
    }

    // Normalize snake_case regression options to camelCase
    const rawReg = rawConfig.regression || {};
    const normalizedRegression = {
      ...baseProfile.regression,
      failOnLevels: rawReg.failOnLevels || rawReg.fail_on_levels || baseProfile.regression?.failOnLevels,
      failOnSeverities: rawReg.failOnSeverities || rawReg.fail_on_severities || baseProfile.regression?.failOnSeverities,
      allowExpectedChanges: rawReg.allowExpectedChanges ?? rawReg.allow_expected_changes ?? baseProfile.regression?.allowExpectedChanges,
      maxAllowedRegressions: rawReg.maxAllowedRegressions ?? rawReg.max_allowed_regressions ?? baseProfile.regression?.maxAllowedRegressions
    };

    // Normalize invariant policy overrides
    const mergedInvariants: Record<string, InvariantPolicyOverride> = {
      ...baseProfile.invariants,
      ...(rawConfig.invariants || {})
    };

    // Support convenient high-level policy shortcuts (e.g. policy: { canonical: required, sitemap: recommended })
    const rawPolicy = rawConfig.policy || {};
    if (rawPolicy.canonical) {
      const lvl = String(rawPolicy.canonical).toUpperCase() as RequirementLevel;
      mergedInvariants['INV-CANONICAL-RESOLVES'] = { requirementLevel: lvl, severity: 'high', enabled: true };
    }
    if (rawPolicy.sitemap) {
      const lvl = String(rawPolicy.sitemap).toUpperCase() as RequirementLevel;
      mergedInvariants['INV-SITEMAP-PRESENT'] = { requirementLevel: lvl, severity: 'medium', enabled: true };
    }
    if (rawPolicy.llms_txt || rawPolicy.llmsTxt) {
      const lvl = String(rawPolicy.llms_txt || rawPolicy.llmsTxt).toUpperCase() as RequirementLevel;
      mergedInvariants['INV-LLMS-TXT'] = { requirementLevel: lvl, severity: 'low', enabled: true };
    }

    const merged: PolicyConfig = {
      version: rawConfig.version || baseProfile.version,
      profile: baseProfileName,
      regression: normalizedRegression,
      invariants: mergedInvariants,
      framework: rawConfig.framework
    };

    return merged;
  }

  public static parseConfigFile(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (filePath.endsWith('.json')) {
        return JSON.parse(content);
      }
      return this.parseYaml(content);
    } catch {
      return null;
    }
  }

  public static parseYaml(content: string): Record<string, any> {
    try {
      const parsed = YAML.parse(content);
      return (typeof parsed === 'object' && parsed !== null) ? parsed : {};
    } catch {
      return {};
    }
  }

  public static isRegressionBreachingPolicy(
    diff: InvariantDiffItem,
    policy: PolicyConfig
  ): boolean {
    if (diff.status === 'EXPECTED_CHANGE') {
      return policy.regression?.allowExpectedChanges === false;
    }

    if (diff.status !== 'NEW_REGRESSION') return false;

    const invOverride = policy.invariants?.[diff.invariantId];
    if (invOverride && invOverride.enabled === false) {
      return false; // Explicitly disabled by project policy
    }

    const level = invOverride?.requirementLevel || diff.requirementLevel || 'REQUIRED';
    const severity = invOverride?.severity || diff.severity || 'high';

    const failLevels = policy.regression?.failOnLevels || ['REQUIRED', 'CONDITIONAL'];
    const failSeverities = policy.regression?.failOnSeverities || ['critical', 'high'];

    const levelBreached = failLevels.includes(level as any);
    const severityBreached = failSeverities.includes(severity as any);

    return levelBreached && severityBreached;
  }

  public static evaluatePolicyGate(
    diffs: InvariantDiffItem[],
    policy: PolicyConfig
  ): {
    pass: boolean;
    breachingDiffs: InvariantDiffItem[];
    totalBreaches: number;
    maxAllowed: number;
    verdict: string;
  } {
    const breachingDiffs = diffs.filter(d => this.isRegressionBreachingPolicy(d, policy));
    const totalBreaches = breachingDiffs.length;
    const maxAllowed = policy.regression?.maxAllowedRegressions ?? 0;

    const pass = totalBreaches <= maxAllowed;
    const verdict = pass
      ? `✅ PASSED (Policy: ${policy.profile}): ${totalBreaches} breach(es) within allowed threshold (max: ${maxAllowed}).`
      : `🚨 FAILED (Policy: ${policy.profile}): ${totalBreaches} invariant regression(s) breached policy (max allowed: ${maxAllowed}).`;

    return {
      pass,
      breachingDiffs,
      totalBreaches,
      maxAllowed,
      verdict
    };
  }
}
