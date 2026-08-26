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

export class SolidStartAdapter implements FrameworkAdapter {
  public id = 'solidstart';
  public name = 'SolidStart';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    const evidence: string[] = [];
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['@solidjs/start'] || deps['solid-start']) {
          evidence.push('@solidjs/start in package dependencies');
        }
      } catch {}
    }

    return {
      matched: evidence.length > 0,
      confidence: evidence.length > 0 ? 0.95 : 0.0,
      evidence
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'solidstart',
      name: path.basename(projectDir),
      hasTypeScript: fs.existsSync(path.join(projectDir, 'tsconfig.json')),
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'src/routes',
      devCommand: 'npm run dev',
      defaultDevPort: 3000
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
          scan(full, prefix === '/' ? `/${e.name}` : `${prefix}/${e.name}`);
        } else if (e.isFile() && /\.(tsx|jsx|js|ts)$/.test(e.name)) {
          const base = e.name.replace(/\.(tsx|jsx|js|ts)$/, '');
          const routePath = base === 'index' ? prefix : (prefix === '/' ? `/${base}` : `${prefix}/${base}`);
          const rel = path.relative(projectDir, full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf-8');

          discovered.push({
            routePath: routePath === '' ? '/' : routePath,
            sourceFilePath: rel,
            isDynamic: routePath.includes('['),
            dynamicParams: (routePath.match(/\[([a-zA-Z0-9_]+)\]/g) || []).map(p => p.slice(1, -1)),
            routeType: 'page',
            hasMetadataExport: /<Title\b|<Meta\b/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json/.test(content),
            hasHeadComponent: /<Title\b|<Meta\b/i.test(content),
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
    const has = /<Title\b|<Meta\b/i.test(content);
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
