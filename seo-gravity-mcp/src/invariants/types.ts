import { SeverityLevel, Provenance } from '../types/findings.js';

export type InvariantScope = 'site_wide' | 'page' | 'route' | 'crawl_graph';

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
  statusCode?: number;
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
}

export interface InvariantDefinition {
  id: string; // e.g. "INV-HTTP-200"
  name: string;
  description: string;
  category: InvariantCategory;
  severity: SeverityLevel;
  scope: InvariantScope;
  expectedCondition: string;
  failureEvidence: string;
  remediationGuide: string;
  verificationMethod: string;
  evaluate(context: InvariantEvaluationContext): InvariantEvaluationResult;
}
