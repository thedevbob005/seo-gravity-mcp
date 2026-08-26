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

export class SvelteKitAdapter implements FrameworkAdapter {
  public id = 'sveltekit';
  public name = 'SvelteKit';

  public detect(projectDir: string): boolean {
    const pkgPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return Boolean(deps['@sveltejs/kit']);
    } catch {
      return false;
    }
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'sveltekit',
      name: path.basename(projectDir),
      hasTypeScript: fs.existsSync(path.join(projectDir, 'tsconfig.json')),
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'src/routes',
      devCommand: 'npm run dev',
      defaultDevPort: 5173
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const routesDir = path.join(projectDir, 'src/routes');
    const discovered: DiscoveredRoute[] = [];
    if (!fs.existsSync(routesDir)) return discovered;

    const scan = (dir: string, prefix: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          const next = prefix === '/' ? `/${e.name}` : `${prefix}/${e.name}`;
          scan(full, next);
        } else if (e.isFile() && e.name.startsWith('+page.svelte')) {
          const rel = path.relative(projectDir, full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf-8');
          discovered.push({
            routePath: prefix,
            sourceFilePath: rel,
            isDynamic: prefix.includes('['),
            dynamicParams: (prefix.match(/\[([a-zA-Z0-9_-]+)\]/g) || []).map(p => p.slice(1, -1)),
            routeType: 'page',
            hasMetadataExport: /<title\b|<svelte:head\b/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json/.test(content),
            hasHeadComponent: /<svelte:head\b/i.test(content),
            isClientComponent: false
          });
        }
      }
    };

    scan(routesDir, '/');
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
    const has = /<svelte:head\b|<title\b/i.test(content);
    return { hasMetadata: has, type: has ? 'jsx_head' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    return { hasCanonical: /rel=["']canonical["']/i.test(content), type: 'link_jsx_tag' };
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
    const paths = ['static/sitemap.xml', 'sitemap.xml'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['static/llms.txt', 'llms.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }
}
