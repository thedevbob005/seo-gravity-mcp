import { PolymorphicEvidence } from './evidence.js';

export type ProvenanceSource =
  | 'rendered_dom'
  | 'raw_html'
  | 'ast_inspection'
  | 'template_inspection'
  | 'route_config'
  | 'http_headers'
  | 'robots_txt'
  | 'sitemap_xml'
  | 'static_analysis'
  | 'provider_api'
  | 'runtime_hook';

export interface Provenance {
  analyzer: string; // e.g. "seo_technical_audit", "NextAppAdapter", "WordPressAdapter"
  source: ProvenanceSource;
  timestamp: string;
  provider: string; // e.g. "native", "typescript_ast", "cheerio", "filesystem"
}

export interface PageIdentity {
  logicalPageId: string; // Deterministic hash of normalized origin + path
  canonicalUrl?: string;
  observedUrl: string;
  routePattern?: string; // e.g. "/blog/:slug"
  normalizedPath: string; // e.g. "/blog/my-post"
}

export interface Observation {
  id: string; // e.g. "obs_canonical_tag"
  logicalPageId: string;
  observedUrl: string;
  key: string; // e.g. "canonical_tag", "status_code", "meta_title", "h1_texts", "schema_types"
  rawValue: any;
  normalizedValue?: string | number | boolean;
  provenance: Provenance;
  evidence?: PolymorphicEvidence;
}

export interface ASTSourceRange {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  astNodeType?: string; // e.g. "ExportDeclaration", "CallExpression", "JsxElement", "BladeDirective"
  exportName?: string;
  snippet?: string;
}

export type RequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'RECOMMENDED' | 'OPTIONAL';
export type InvariantSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type InvariantType =
  | 'INV-HTTP-200'
  | 'INV-CANONICAL-RESOLVES'
  | 'INV-TITLE-PRESENT'
  | 'INV-LINK-ACCESSIBLE'
  | 'INV-ROBOTS-ALLOWED'
  | 'INV-SITEMAP-PRESENT'
  | 'INV-LLMS-TXT'
  | 'INVARIANT_HTTP_200'
  | 'INVARIANT_CANONICAL_PRESENT'
  | 'INVARIANT_INDEXABLE'
  | 'INVARIANT_SCHEMA_VALID'
  | 'INVARIANT_TITLE_PRESENT'
  | 'INVARIANT_DESCRIPTION_PRESENT'
  | 'INVARIANT_LINK_ACCESSIBLE'
  | 'INVARIANT_ROBOTS_ALLOWED';

export interface SEOInvariant {
  id: InvariantType;
  logicalPageId: string;
  url: string;
  description: string;
  expectedCondition: string;
  observedCondition: string;
  satisfied: boolean;
  requirementLevel?: RequirementLevel;
  severity?: InvariantSeverity;
  provenance: Provenance;
  evidence?: PolymorphicEvidence;
}

export type InvariantDiffStatus =
  | 'NEW_REGRESSION'
  | 'RESOLVED'
  | 'UNCHANGED'
  | 'EXPECTED_CHANGE'
  | 'UNKNOWN';

export interface InvariantDiffItem {
  invariantId: InvariantType;
  logicalPageId: string;
  url: string;
  status: InvariantDiffStatus;
  baselineSatisfied: boolean;
  currentSatisfied: boolean;
  message: string;
  requirementLevel?: RequirementLevel;
  severity?: InvariantSeverity;
  sourceRange?: ASTSourceRange;
  evidence?: PolymorphicEvidence;
}

export interface GitMetadata {
  commitHash?: string;
  shortHash?: string;
  branch?: string;
  isDirty?: boolean;
  author?: string;
  commitDate?: string;
  changedFilesSinceBase?: string[];
}
