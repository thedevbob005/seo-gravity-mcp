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

    const baseProfileName: PolicyProfileName = (rawConfig?.profile as PolicyProfileName) || 'balanced';
    const baseProfile = BUILTIN_PROFILES[baseProfileName] || BUILTIN_PROFILES.balanced;

    if (!rawConfig) {
      return baseProfile;
    }

    // Normalize regression config (support snake_case from README and camelCase)
    const rawReg = rawConfig.regression || {};
    const normalizedRegression = {
      ...baseProfile.regression,
      failOnLevels: rawReg.failOnLevels || rawReg.fail_on_levels || baseProfile.regression?.failOnLevels,
      failOnSeverities: rawReg.failOnSeverities || rawReg.fail_on_severities || baseProfile.regression?.failOnSeverities,
      allowExpectedChanges: rawReg.allowExpectedChanges ?? rawReg.allow_expected_changes ?? baseProfile.regression?.allowExpectedChanges,
      maxAllowedRegressions: rawReg.maxAllowedRegressions ?? rawReg.max_allowed_regressions ?? baseProfile.regression?.maxAllowedRegressions
    };

    // Normalize policy / invariants shortcuts
    const mergedInvariants: Record<string, any> = {
      ...baseProfile.invariants,
      ...(rawConfig.invariants || {})
    };

    // Handle high-level policy shortcuts (e.g. policy: { canonical: required, sitemap: recommended })
    const rawPolicy = rawConfig.policy || {};
    if (rawPolicy.canonical) {
      const lvl = String(rawPolicy.canonical).toUpperCase();
      mergedInvariants['INV-CANONICAL-RESOLVES'] = { requirementLevel: lvl, severity: 'high', enabled: true };
    }
    if (rawPolicy.sitemap) {
      const lvl = String(rawPolicy.sitemap).toUpperCase();
      mergedInvariants['INV-SITEMAP-PRESENT'] = { requirementLevel: lvl, severity: 'medium', enabled: true };
    }
    if (rawPolicy.llms_txt || rawPolicy.llmsTxt) {
      const lvl = String(rawPolicy.llms_txt || rawPolicy.llmsTxt).toUpperCase();
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
    const root: Record<string, any> = {};
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentSubsection: string | null = null;

    for (let rawLine of lines) {
      // Strip comments
      const commentIdx = rawLine.indexOf('#');
      if (commentIdx !== -1) {
        rawLine = rawLine.slice(0, commentIdx);
      }
      const line = rawLine.replace(/\r/g, '');
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const trimmed = line.trim();

      if (indent === 0) {
        // Top-level key
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();

        if (value) {
          root[key] = this.parseScalarValue(value);
          currentSection = null;
        } else {
          root[key] = {};
          currentSection = key;
        }
        currentSubsection = null;
      } else if (indent === 2 && currentSection) {
        // First-level nested key
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();

        if (value) {
          root[currentSection][key] = this.parseScalarValue(value);
          currentSubsection = null;
        } else {
          root[currentSection][key] = {};
          currentSubsection = key;
        }
      } else if (indent >= 4 && currentSection && currentSubsection) {
        // Second-level nested key
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        root[currentSection][currentSubsection][key] = this.parseScalarValue(value);
      }
    }

    return root;
  }

  private static parseScalarValue(val: string): any {
    const clean = val.trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
      return clean
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
    if (clean === 'true') return true;
    if (clean === 'false') return false;
    if (clean === 'null') return null;
    if (!isNaN(Number(clean)) && clean !== '') return Number(clean);
    return clean.replace(/^['"]|['"]$/g, '');
  }

  public static isRegressionBreachingPolicy(
    diff: InvariantDiffItem,
    policy: PolicyConfig
  ): boolean {
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
}
