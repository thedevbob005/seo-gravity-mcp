import * as fs from 'fs';
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

export class RemixAdapter implements FrameworkAdapter {
  public id = 'remix';
  public name = 'Remix Framework';

  public detect(projectDir: string): boolean {
    const pkgPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return Boolean(deps['@remix-run/react'] || deps['@remix-run/node']);
    } catch {
      return false;
    }
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'remix',
      name: path.basename(projectDir),
      hasTypeScript: fs.existsSync(path.join(projectDir, 'tsconfig.json')),
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'app/routes',
      devCommand: 'npm run dev',
      defaultDevPort: 3000
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const routesDir = path.join(projectDir, 'app/routes');
    const discovered: DiscoveredRoute[] = [];
    if (!fs.existsSync(routesDir)) return discovered;

    const entries = fs.readdirSync(routesDir);
    for (const file of entries) {
      if (!/\.(tsx|jsx|js|ts)$/.test(file)) continue;
      const base = file.replace(/\.(tsx|jsx|js|ts)$/, '');
      const rel = path.join('app/routes', file).replace(/\\/g, '/');
      const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');

      let routePath = '/' + base.replace(/\._index$/, '').replace(/\./g, '/').replace(/_index$/, '');
      if (routePath === '//' || routePath === '') routePath = '/';

      discovered.push({
        routePath,
        sourceFilePath: rel,
        isDynamic: routePath.includes('$') || routePath.includes(':'),
        dynamicParams: (routePath.match(/\$([a-zA-Z0-9_-]+)/g) || []).map(p => p.slice(1)),
        routeType: 'page',
        hasMetadataExport: /export\s+const\s+meta\b|export\s+function\s+meta\b/.test(content),
        hasGenerateMetadata: false,
        hasSchemaMarkup: /application\/ld\+json/.test(content),
        hasHeadComponent: false,
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
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasMetadata: false, type: 'none' };
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasMeta = /export\s+(const|function)\s+meta\b/.test(content);
    return { hasMetadata: hasMeta, type: hasMeta ? 'static_export' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { hasCanonical: /canonical/.test(content), type: 'metadata_property' };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasSchema: false, typesFound: [] };
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { hasSchema: /application\/ld\+json/.test(content), typesFound: ['JSON-LD'] };
  }

  public findRobotsConfig(projectDir: string): string | null {
    const paths = ['public/robots.txt', 'robots.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = ['public/sitemap.xml', 'sitemap.xml'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['public/llms.txt', 'llms.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }
}
