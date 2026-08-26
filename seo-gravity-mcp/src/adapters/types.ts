import {
  DiscoveredRoute,
  ProjectFrameworkInfo,
  RouteSourceMapping,
  ASTSourceRange
} from '../types/findings.js';

export interface MetadataLocationInfo {
  hasMetadata: boolean;
  type: 'static_export' | 'dynamic_function' | 'jsx_head' | 'none';
  sourceRange?: ASTSourceRange;
  titleSnippet?: string;
  descriptionSnippet?: string;
}

export interface CanonicalLocationInfo {
  hasCanonical: boolean;
  type: 'metadata_property' | 'link_jsx_tag' | 'header_config' | 'none';
  canonicalUrl?: string;
  sourceRange?: ASTSourceRange;
}

export interface SchemaLocationInfo {
  hasSchema: boolean;
  typesFound: string[];
  sourceRange?: ASTSourceRange;
}

export interface FrameworkAdapter {
  id: string;
  name: string;
  detect(projectDir: string): boolean;
  getProjectInfo(projectDir: string): ProjectFrameworkInfo;
  discoverRoutes(projectDir: string): DiscoveredRoute[];
  mapRouteToSource(targetUrl: string, routes: DiscoveredRoute[]): RouteSourceMapping;
  findMetadataImplementation(projectDir: string, route: DiscoveredRoute): Promise<MetadataLocationInfo>;
  findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo>;
  findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo>;
  findRobotsConfig(projectDir: string): string | null;
  findSitemapConfig(projectDir: string): string | null;
  findLlmsTxt(projectDir: string): string | null;
}
