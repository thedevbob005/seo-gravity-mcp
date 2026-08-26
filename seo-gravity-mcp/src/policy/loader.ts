import * as fs from 'fs';
import * as path from 'path';
import { PolicyConfig, PolicyProfileName } from './types.js';
import { BUILTIN_PROFILES } from './profiles.js';
import { InvariantDiffItem } from '../types/canonical.js';

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

    const baseProfileName: PolicyProfileName = rawConfig?.profile || 'balanced';
    const baseProfile = BUILTIN_PROFILES[baseProfileName] || BUILTIN_PROFILES.balanced;

    if (!rawConfig) {
      return baseProfile;
    }

    // Merge overrides
    const merged: PolicyConfig = {
      version: rawConfig.version || baseProfile.version,
      profile: baseProfileName,
      regression: {
        ...baseProfile.regression,
        ...rawConfig.regression
      },
      invariants: {
        ...baseProfile.invariants,
        ...rawConfig.invariants
      },
      framework: rawConfig.framework
    };

    return merged;
  }

  private static parseConfigFile(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (filePath.endsWith('.json')) {
        return JSON.parse(content);
      }
      // Basic YAML key-value parser for simple .seo-gravity.yml
      const parsed: any = { profile: 'balanced', invariants: {}, regression: {} };
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('profile:')) {
          parsed.profile = trimmed.split(':')[1].trim().replace(/['"]/g, '');
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }

  public static isRegressionBreachingPolicy(
    diff: InvariantDiffItem,
    policy: PolicyConfig
  ): boolean {
    if (diff.status !== 'NEW_REGRESSION') return false;

    const invOverride = policy.invariants?.[diff.invariantId];
    if (invOverride && invOverride.enabled === false) {
      return false; // Disabled by project policy
    }

    const level = invOverride?.requirementLevel || diff.requirementLevel || 'REQUIRED';
    const severity = invOverride?.severity || diff.severity || 'high';

    const failLevels = policy.regression?.failOnLevels || ['REQUIRED', 'CONDITIONAL'];
    const failSeverities = policy.regression?.failOnSeverities || ['critical', 'high'];

    const levelBreached = failLevels.includes(level as any);
    const severityBreached = failSeverities.includes(severity as any);

    return levelBreached && severityBreached;
  }
}
