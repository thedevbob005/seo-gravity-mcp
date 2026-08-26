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
    let rawConfig: unknown = null;

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

    if (!rawConfig) {
      return BUILTIN_PROFILES.balanced;
    }

    const parsed = PolicyConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid SEO Gravity policy configuration: ${details}`);
    }

    const config = parsed.data;
    const baseProfileName: PolicyProfileName = config.profile || 'balanced';
    const baseProfile = BUILTIN_PROFILES[baseProfileName];

    if (!baseProfile) {
      throw new Error(`Unknown SEO Gravity policy profile: '${baseProfileName}'.`);
    }

    const rawReg = config.regression || {};
    const normalizedRegression = {
      ...baseProfile.regression,
      failOnLevels: rawReg.failOnLevels || baseProfile.regression?.failOnLevels,
      failOnSeverities: rawReg.failOnSeverities || baseProfile.regression?.failOnSeverities,
      allowExpectedChanges: rawReg.allowExpectedChanges ?? baseProfile.regression?.allowExpectedChanges,
      maxAllowedRegressions: rawReg.maxAllowedRegressions ?? baseProfile.regression?.maxAllowedRegressions
    };

    const mergedInvariants: Record<string, InvariantPolicyOverride> = {
      ...baseProfile.invariants,
      ...(config.invariants || {})
    };

    const rawPolicy = config.policy || {};
    if (rawPolicy.canonical !== undefined) {
      const parsedLevel = String(rawPolicy.canonical).toUpperCase();
      if (!['REQUIRED', 'CONDITIONAL', 'RECOMMENDED', 'OPTIONAL'].includes(parsedLevel)) {
        throw new Error(`Invalid policy.canonical requirement level: '${rawPolicy.canonical}'.`);
      }
      const lvl = parsedLevel as RequirementLevel;
      mergedInvariants['INV-CANONICAL-RESOLVES'] = { requirementLevel: lvl, severity: 'high', enabled: true };
    }
    if (rawPolicy.sitemap !== undefined) {
      const parsedLevel = String(rawPolicy.sitemap).toUpperCase();
      if (!['REQUIRED', 'CONDITIONAL', 'RECOMMENDED', 'OPTIONAL'].includes(parsedLevel)) {
        throw new Error(`Invalid policy.sitemap requirement level: '${rawPolicy.sitemap}'.`);
      }
      const lvl = parsedLevel as RequirementLevel;
      mergedInvariants['INV-SITEMAP-PRESENT'] = { requirementLevel: lvl, severity: 'medium', enabled: true };
    }
    if (rawPolicy.llms_txt !== undefined || rawPolicy.llmsTxt !== undefined) {
      const rawLevel = rawPolicy.llms_txt ?? rawPolicy.llmsTxt;
      const parsedLevel = String(rawLevel).toUpperCase();
      if (!['REQUIRED', 'CONDITIONAL', 'RECOMMENDED', 'OPTIONAL'].includes(parsedLevel)) {
        throw new Error(`Invalid policy.llms_txt requirement level: '${rawLevel}'.`);
      }
      const lvl = parsedLevel as RequirementLevel;
      mergedInvariants['INV-LLMS-TXT'] = { requirementLevel: lvl, severity: 'low', enabled: true };
    }

    return {
      version: config.version || baseProfile.version,
      profile: baseProfileName,
      regression: normalizedRegression,
      invariants: mergedInvariants,
      framework: config.framework
    };
  }

  public static parseConfigFile(filePath: string): unknown {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.json')) {
      try {
        return JSON.parse(content);
      } catch (err) {
        throw new Error(`Invalid JSON policy configuration '${filePath}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    try {
      return this.parseYaml(content);
    } catch (err) {
      throw new Error(`Invalid YAML policy configuration '${filePath}': ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public static parseYaml(content: string): Record<string, unknown> {
    const parsed = YAML.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Policy YAML root must be an object.');
    }
    return parsed as Record<string, unknown>;
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
      return false;
    }

    const level = invOverride?.requirementLevel || diff.requirementLevel || 'REQUIRED';
    const severity = invOverride?.severity || diff.severity || 'high';

    const failLevels = policy.regression?.failOnLevels || ['REQUIRED', 'CONDITIONAL'];
    const failSeverities = policy.regression?.failOnSeverities || ['critical', 'high'];

    return failLevels.includes(level as any) && failSeverities.includes(severity as any);
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

    return { pass, breachingDiffs, totalBreaches, maxAllowed, verdict };
  }
}
