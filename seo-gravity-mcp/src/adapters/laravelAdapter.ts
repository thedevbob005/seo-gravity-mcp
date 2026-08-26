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

export class LaravelAdapter implements FrameworkAdapter {
  public id = 'laravel';
  public name = 'Laravel (Blade & Artisan)';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    const evidence: string[] = [];
    if (fs.existsSync(path.join(projectDir, 'artisan'))) {
      evidence.push('artisan CLI entry file detected');
    }

    const composerPath = path.join(projectDir, 'composer.json');
    if (fs.existsSync(composerPath)) {
      try {
        const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
        const deps = { ...composer.require, ...composer['require-dev'] };
        if (deps['laravel/framework']) {
          evidence.push('laravel/framework in composer.json require');
        }
      } catch {}
    }

    return {
      matched: evidence.length > 0,
      confidence: evidence.length >= 2 ? 0.99 : 0.92,
      evidence
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'laravel',
      name: path.basename(projectDir),
      hasTypeScript: false,
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'routes',
      devCommand: 'php artisan serve',
      defaultDevPort: 8000
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const discovered: DiscoveredRoute[] = [];
    const webRoutesPath = path.join(projectDir, 'routes/web.php');

    if (fs.existsSync(webRoutesPath)) {
      const content = fs.readFileSync(webRoutesPath, 'utf-8');
      const routeMatches = content.matchAll(/Route::(get|view|match)\(\s*['"]([^'"]+)['"]/g);
      for (const m of routeMatches) {
        const rawPath = m[2];
        const routePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
        if (!discovered.some(d => d.routePath === routePath)) {
          discovered.push({
            routePath,
            sourceFilePath: 'routes/web.php',
            isDynamic: routePath.includes('{'),
            dynamicParams: (routePath.match(/\{([a-zA-Z0-9_]+)\}/g) || []).map(p => p.slice(1, -1)),
            routeType: 'page',
            hasMetadataExport: true,
            hasGenerateMetadata: false,
            hasSchemaMarkup: false,
            hasHeadComponent: true,
            isClientComponent: false
          });
        }
      }
    }

    // Also scan Blade views in resources/views
    const viewsDir = path.join(projectDir, 'resources/views');
    if (fs.existsSync(viewsDir)) {
      const scanViews = (dir: string, prefix: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            scanViews(full, prefix === '/' ? `/${e.name}` : `${prefix}/${e.name}`);
          } else if (e.isFile() && e.name.endsWith('.blade.php')) {
            const base = e.name.replace(/\.blade\.php$/, '');
            const routePath = base === 'welcome' || base === 'index' ? '/' : (prefix === '/' ? `/${base}` : `${prefix}/${base}`);
            const rel = path.relative(projectDir, full).replace(/\\/g, '/');
            const viewContent = fs.readFileSync(full, 'utf-8');

            const existing = discovered.find(d => d.routePath === routePath);
            if (existing) {
              existing.sourceFilePath = rel;
              existing.hasMetadataExport = /@section\(['"]title['"]|<title\b|<x-slot:title/i.test(viewContent);
              existing.hasSchemaMarkup = /application\/ld\+json/.test(viewContent);
            } else {
              discovered.push({
                routePath,
                sourceFilePath: rel,
                isDynamic: false,
                dynamicParams: [],
                routeType: 'page',
                hasMetadataExport: /@section\(['"]title['"]|<title\b|<x-slot:title/i.test(viewContent),
                hasGenerateMetadata: false,
                hasSchemaMarkup: /application\/ld\+json/.test(viewContent),
                hasHeadComponent: true,
                isClientComponent: false
              });
            }
          }
        }
      };
      scanViews(viewsDir, '/');
    }

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

    // Dynamic patterns {param}
    for (const r of routes) {
      if (!r.isDynamic) continue;
      const regexStr = '^' + r.routePath.replace(/\{[a-zA-Z0-9_]+\}/g, '[^/]+') + '$';
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
    const has = /@section\(['"]title['"]|<title\b|<x-slot:title/i.test(content);
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
