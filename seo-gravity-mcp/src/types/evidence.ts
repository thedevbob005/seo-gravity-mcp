export type EvidenceType =
  | 'ast'
  | 'template'
  | 'route_config'
  | 'dom'
  | 'header'
  | 'runtime'
  | 'git'
  | 'external';

export interface BaseEvidence {
  type: EvidenceType;
  description: string;
  sourceFile?: string;
  timestamp: string;
}

export interface AstEvidence extends BaseEvidence {
  type: 'ast';
  sourceFile: string;
  symbolName?: string;
  nodeType?: string;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  codeSnippet?: string;
}

export interface TemplateEvidence extends BaseEvidence {
  type: 'template';
  sourceFile: string;
  templateEngine: 'blade' | 'twig' | 'vue' | 'svelte' | 'astro' | 'php' | 'markdown' | 'html';
  blockName?: string;
  startLine?: number;
  endLine?: number;
  templateSnippet?: string;
}

export interface RouteConfigEvidence extends BaseEvidence {
  type: 'route_config';
  sourceFile?: string;
  configFormat: 'laravel_routes' | 'symfony_yaml' | 'next_app_dir' | 'next_pages_dir' | 'react_router' | 'static_file' | 'implicit_default';
  declaredPattern: string;
}

export interface DomEvidence extends BaseEvidence {
  type: 'dom';
  selector?: string;
  htmlSnippet: string;
  elementTag?: string;
  attributeName?: string;
  attributeValue?: string;
}

export interface HeaderEvidence extends BaseEvidence {
  type: 'header';
  statusCode?: number;
  headerName?: string;
  headerValue?: string;
  rawHeaders?: Record<string, string>;
}

export interface RuntimeEvidence extends BaseEvidence {
  type: 'runtime';
  hookName?: string;
  filterName?: string;
  middlewareName?: string;
  runtimeSource: 'wordpress_hook' | 'php_output_buffer' | 'ssr_stream' | 'client_hydration';
}

export interface GitEvidence extends BaseEvidence {
  type: 'git';
  baseCommit: string;
  headCommit: string;
  diffHunk?: string;
  changedLinesCount: number;
  affectedSymbols?: string[];
}

export interface ExternalEvidence extends BaseEvidence {
  type: 'external';
  providerName: string;
  endpointUrl?: string;
  responsePayloadSummary?: string;
}

export type PolymorphicEvidence =
  | AstEvidence
  | TemplateEvidence
  | RouteConfigEvidence
  | DomEvidence
  | HeaderEvidence
  | RuntimeEvidence
  | GitEvidence
  | ExternalEvidence;
