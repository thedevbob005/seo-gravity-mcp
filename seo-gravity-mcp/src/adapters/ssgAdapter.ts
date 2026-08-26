import * as fs from 'fs';
import * as path from 'path';
import {
  FrameworkAdapter,
  FrameworkDetectionResult,
  MetadataLocationInfo,
  CanonicalLocationInfo,
  SchemaLocationInfo
} from './types.js';
import {
  DiscoveredRoute,
  ProjectFrameworkInfo,
  RouteSourceMapping
} from '../types/findings.js';

export class SsgAdapter implements FrameworkAdapter {
  public id = 'ssg-markdown';
  public name = 'Markdown Static Site Generators (Hugo/Jekyll/11ty)';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    const evidence: string[] = [];
    if (fs.existsSync(path.join(projectDir, 'hugo.toml')) || fs.existsSync(path.join(projectDir, 'config.toml'))) {
      evidence.push('Hugo configuration file detected');
    }
    if (fs.existsSync(path.join(projectDir, '_config.yml'))) {
      evidence.push('Jekyll _config.yml detected');
    }
    if (fs.existsSync(path.join(projectDir, '.eleventy.js')) || fs.existsSync(path.join(projectDir, 'eleventy.config.js'))) {
      evidence.push('11ty configuration detected');
    }
    if (fs.existsSync(path.join(projectDir, 'docusaurus.config.js'))) {
      evidence.push('Docusaurus configuration detected');
    }

    return {
      matched: evidence.length > 0,
      confidence: evidence.length > 0 ? 0.95 : 0.0,
      evidence
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'ssg-markdown',
      name: path.basename(projectDir),
      hasTypeScript: false,
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'content',
      defaultDevPort: 1313
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const discovered: DiscoveredRoute[] = [];

    const contentDirs = ['content', '_posts', 'docs', 'pages'];
    const scanDir = (dir: string, prefix: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          scanDir(full, prefix === '/' ? `/${e.name}` : `${prefix}/${e.name}`);
        } else if (e.isFile() && /\.(md|markdown|html)$/.test(e.name)) {
          const base = e.name.replace(/\.(md|markdown|html)$/, '');
          let routePath = base === '_index' || base === 'index' ? prefix : (prefix === '/' ? `/${base}` : `${prefix}/${base}`);
          if (routePath === '') routePath = '/';

          const rel = path.relative(projectDir, full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf-8');

          discovered.push({
            routePath,
            sourceFilePath: rel,
            isDynamic: false,
            dynamicParams: [],
            routeType: 'page',
            hasMetadataExport: /title:\s*|description:\s*|<title\b/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json/.test(content),
            hasHeadComponent: true,
            isClientComponent: false
          });
        }
      }
    };

    for (const cDir of contentDirs) {
      scanDir(path.join(projectDir, cDir), '/');
    }

    if (discovered.length === 0 && fs.existsSync(path.join(projectDir, 'index.html'))) {
      discovered.push({
        routePath: '/',
        sourceFilePath: 'index.html',
        isDynamic: false,
        dynamicParams: [],
        routeType: 'page',
        hasMetadataExport: true,
        hasGenerateMetadata: false,
        hasSchemaMarkup: false,
        hasHeadComponent: true,
        isClientComponent: false
      });
    }

    return discovered;
  }

  public mapRouteToSource(targetUrl: string, routes: DiscoveredRoute[]): RouteSourceMapping {
    let urlPath = targetUrl.startsWith('http') ? new URL(targetUrl).pathname : targetUrl;
    urlPath = urlPath.replace(/\/$/, '') || '/';
    const match = routes.find(r => r.routePath === urlPath);
    return {
      urlPath,
      matchedRoute: match,
      sourceFilePath: match?.sourceFilePath,
      confidence: match ? 1.0 : 0.0,
      resolutionMethod: match ? 'exact_match' : 'unmapped'
    };
  }

  public async findMetadataImplementation(projectDir: string, route: DiscoveredRoute): Promise<MetadataLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasMetadata: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    const has = /title:\s*|<title\b/i.test(content);
    return { hasMetadata: has, type: has ? 'static_export' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    return { hasCanonical: /canonical:\s*|rel=["']canonical["']/i.test(content), type: 'metadata_property' };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasSchema: false, typesFound: [] };
    const content = fs.readFileSync(full, 'utf-8');
    return { hasSchema: /application\/ld\+json/i.test(content), typesFound: ['JSON-LD'] };
  }

  public findRobotsConfig(projectDir: string): string | null {
    const paths = ['static/robots.txt', 'robots.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = ['public/sitemap.xml', 'sitemap.xml'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['static/llms.txt', 'llms.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }
}
