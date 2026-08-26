import * as path from 'path';
import {
  FrameworkAdapter,
  MetadataLocationInfo,
  CanonicalLocationInfo,
  SchemaLocationInfo
} from './types.js';
import {
  DiscoveredRoute,
  ProjectFrameworkInfo,
  RouteSourceMapping
} from '../types/findings.js';

export class UnknownAdapter implements FrameworkAdapter {
  public id = 'unknown';
  public name = 'Unknown / Unrecognized Framework';

  public detect(_projectDir: string): boolean {
    return false;
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'unknown',
      name: path.basename(projectDir),
      hasTypeScript: false,
      hasSitemapConfig: false,
      hasRobotsConfig: false,
      hasLlmsTxt: false,
      rootDir: path.resolve(projectDir),
      routesDir: '.',
      defaultDevPort: 3000
    };
  }

  public discoverRoutes(_projectDir: string): DiscoveredRoute[] {
    return [];
  }

  public mapRouteToSource(targetUrl: string, _routes: DiscoveredRoute[]): RouteSourceMapping {
    return {
      urlPath: targetUrl,
      confidence: 0.0,
      resolutionMethod: 'unmapped'
    };
  }

  public async findMetadataImplementation(_projectDir: string, _route: DiscoveredRoute): Promise<MetadataLocationInfo> {
    return { hasMetadata: false, type: 'none' };
  }

  public async findCanonicalDeclaration(_projectDir: string, _route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    return { hasCanonical: false, type: 'none' };
  }

  public async findSchemaDeclaration(_projectDir: string, _route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    return { hasSchema: false, typesFound: [] };
  }

  public findRobotsConfig(_projectDir: string): string | null {
    return null;
  }

  public findSitemapConfig(_projectDir: string): string | null {
    return null;
  }

  public findLlmsTxt(_projectDir: string): string | null {
    return null;
  }
}
