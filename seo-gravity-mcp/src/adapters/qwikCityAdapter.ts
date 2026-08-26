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

export class QwikCityAdapter implements FrameworkAdapter {
  public id = 'qwik-city';
  public name = 'Qwik City';

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
        if (deps['@builder.io/qwik-city'] || deps['@builder.io/qwik']) {
          evidence.push('@builder.io/qwik-city in dependencies');
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
      framework: 'qwik-city',
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
        } else if (e.isFile() && e.name.startsWith('index.') && /\.(tsx|jsx|js|ts)$/.test(e.name)) {
          const rel = path.relative(projectDir, full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf-8');

          discovered.push({
            routePath: prefix,
            sourceFilePath: rel,
            isDynamic: prefix.includes('['),
            dynamicParams: (prefix.match(/\[([a-zA-Z0-9_]+)\]/g) || []).map(p => p.slice(1, -1)),
            routeType: 'page',
            hasMetadataExport: /export\s+const\s+head\b|DocumentHead/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json/.test(content),
            hasHeadComponent: /export\s+const\s+head\b/i.test(content),
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
    if (match) {
      return {
        urlPath,
        matchedRoute: match,
        sourceFilePath: match.sourceFilePath,
        confidence: 1.0,
        resolutionMethod: 'exact_match'
      };
    }

    // Dynamic patterns
    for (const r of routes) {
      if (!r.isDynamic) continue;
      const regexStr = '^' + r.routePath.replace(/\[([a-zA-Z0-9_]+)\]/g, '[^/]+') + '$';
      try {
        if (new RegExp(regexStr).test(urlPath)) {
          return {
            urlPath,
            matchedRoute: r,
            sourceFilePath: r.sourceFilePath,
            confidence: 0.95,
            resolutionMethod: 'pattern_match'
          };
        }
      } catch {}
    }

    return {
      urlPath,
      confidence: 0.0,
      resolutionMethod: 'unmapped'
    };
  }

  public async findMetadataImplementation(projectDir: string, route: DiscoveredRoute): Promise<MetadataLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasMetadata: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    const has = /export\s+const\s+head\b/i.test(content);
    return { hasMetadata: has, type: has ? 'static_export' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    return { hasCanonical: /canonical/i.test(content), type: 'metadata_property' };
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
