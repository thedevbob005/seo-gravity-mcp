export type ProvenanceSource =
  | 'rendered_dom'
  | 'raw_html'
  | 'ast_inspection'
  | 'http_headers'
  | 'robots_txt'
  | 'sitemap_xml'
  | 'static_analysis'
  | 'provider_api';

export interface Provenance {
  analyzer: string; // e.g. "seo_technical_audit", "NextAppAdapter", "astLocator"
  source: ProvenanceSource;
  timestamp: string;
  provider: string; // e.g. "native", "typescript_ast", "cheerio"
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
}

export interface ASTSourceRange {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  astNodeType?: string; // e.g. "ExportDeclaration", "CallExpression", "JsxElement"
  exportName?: string;
  snippet?: string;
}

export type InvariantType =
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
  provenance: Provenance;
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
  sourceRange?: ASTSourceRange;
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
