import { SeverityLevel, Provenance } from '../types/findings.js';
import { PolymorphicEvidence } from '../types/evidence.js';

export type RequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'RECOMMENDED' | 'OPTIONAL';

export type InvariantScope =
  | 'SITE'
  | 'ROUTE'
  | 'PAGE'
  | 'COMPONENT'
  | 'RESOURCE'
  | 'site_wide'
  | 'crawl_graph';

export type InvariantCategory =
  | 'http'
  | 'indexability'
  | 'canonical'
  | 'metadata'
  | 'links'
  | 'schema'
  | 'robots'
  | 'ai_readiness';

export interface InvariantEvaluationContext {
  url: string;
  logicalPageId: string;
  sourceFilePath?: string;
  sourceRange?: { startLine: number; endLine: number };
  statusCode?: number;
  hasTitle?: boolean;
  hasDescription?: boolean;
  hasMetadata?: boolean;
  hasCanonical?: boolean;
  isIndexable?: boolean;
  hasSchema?: boolean;
  hasRobots?: boolean;
  hasSitemap?: boolean;
  hasLlmsTxt?: boolean;
  incomingLinksCount?: number;
  extractedTitle?: string;
  extractedCanonical?: string;
  rawPayload?: any;
}

export interface InvariantEvaluationResult {
  satisfied: boolean;
  observedCondition: string;
  evidence: string;
  polymorphicEvidence?: PolymorphicEvidence;
}

export interface InvariantDefinition {
  id: string; // e.g. "INV-HTTP-200"
  name: string;
  description: string;
  category: InvariantCategory;
  requirementLevel: RequirementLevel;
  severity: SeverityLevel;
  scope: InvariantScope;
  expectedCondition: string;
  failureEvidence: string;
  remediationGuide: string;
  verificationMethod: string;
  evaluate(context: InvariantEvaluationContext): InvariantEvaluationResult;
}
