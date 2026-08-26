import { RequirementLevel, InvariantSeverity } from '../types/canonical.js';

export type PolicyProfileName =
  | 'strict'
  | 'balanced'
  | 'startup'
  | 'ecommerce'
  | 'documentation';

export interface InvariantPolicyOverride {
  requirementLevel?: RequirementLevel;
  severity?: InvariantSeverity;
  enabled?: boolean;
}

export interface RegressionGateConfig {
  failOnLevels: RequirementLevel[];
  failOnSeverities: InvariantSeverity[];
  allowExpectedChanges: boolean;
  maxAllowedRegressions: number;
}

export interface PolicyConfig {
  version: number;
  profile: PolicyProfileName;
  invariants?: Record<string, InvariantPolicyOverride>;
  regression?: Partial<RegressionGateConfig>;
  framework?: {
    adapter?: string;
    rootDir?: string;
  };
}
