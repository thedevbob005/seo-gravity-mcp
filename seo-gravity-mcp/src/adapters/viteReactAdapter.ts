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

export class ViteReactAdapter implements FrameworkAdapter {
  public id = 'vite-react';
  public name = 'Vite / React SPA';

  public detect(projectDir: string): boolean {
    const pkgPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return Boolean(deps['vite'] || (deps['react'] && !deps['next'] && !deps['astro'] && !deps['@remix-run/react']));
    } catch {
      return false;
    }
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    const pkgPath = path.join(projectDir, 'package.json');
    let pkg: any = {};
    if (fs.existsSync(pkgPath)) {
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      } catch {}
    }

    return {
      framework: 'vite-react',
      name: pkg.name || path.basename(projectDir),
      version: pkg.dependencies?.vite || pkg.devDependencies?.vite,
      packageManager: 'npm',
      hasTypeScript: fs.existsSync(path.join(projectDir, 'tsconfig.json')),
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'src',
      devCommand: 'npm run dev',
      defaultDevPort: 5173
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const discovered: DiscoveredRoute[] = [];

    // Check index.html
    if (fs.existsSync(path.join(projectDir, 'index.html'))) {
      const content = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf-8');
      discovered.push({
        routePath: '/',
        sourceFilePath: 'index.html',
        isDynamic: false,
        dynamicParams: [],
        routeType: 'page',
        hasMetadataExport: /<title\b|<meta\s+name=["']description["']/i.test(content),
        hasGenerateMetadata: false,
        hasSchemaMarkup: /application\/ld\+json/.test(content),
        hasHeadComponent: true,
        isClientComponent: true
      });
    }

    // Scan src for router declarations
    const srcDir = path.join(projectDir, 'src');
    if (fs.existsSync(srcDir)) {
      const scanSrc = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanSrc(fullPath);
          } else if (entry.isFile() && /\.(tsx|jsx|js|ts)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const rel = path.relative(projectDir, fullPath).replace(/\\/g, '/');
            const routeMatches = content.matchAll(/path=["']([^"']+)["']/g);
            for (const m of routeMatches) {
              const rPath = m[1];
              if (rPath && !discovered.some(d => d.routePath === rPath)) {
                discovered.push({
                  routePath: rPath,
                  sourceFilePath: rel,
                  isDynamic: rPath.includes(':'),
                  dynamicParams: (rPath.match(/:[a-zA-Z0-9_-]+/g) || []).map(p => p.slice(1)),
                  routeType: 'page',
                  hasMetadataExport: /<Helmet\b|<title\b/i.test(content),
                  hasGenerateMetadata: false,
                  hasSchemaMarkup: /application\/ld\+json/.test(content),
                  hasHeadComponent: /<Helmet\b/i.test(content),
                  isClientComponent: true
                });
              }
            }
          }
        }
      };
      scanSrc(srcDir);
    }

    return discovered;
  }

  public mapRouteToSource(targetUrl: string, routes: DiscoveredRoute[]): RouteSourceMapping {
    let urlPath = targetUrl;
    try {
      if (targetUrl.startsWith('http')) {
        urlPath = new URL(targetUrl).pathname;
      }
    } catch {
      urlPath = targetUrl;
    }
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

    for (const r of routes) {
      if (!r.isDynamic) continue;
      const regexStr = '^' + r.routePath.replace(/:[a-zA-Z0-9_-]+/g, '[^/]+') + '$';
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
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasMetadata: false, type: 'none' };
    const content = fs.readFileSync(fullPath, 'utf-8');
    const has = /<Helmet\b|<title\b/i.test(content);
    return { hasMetadata: has, type: has ? 'jsx_head' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { hasCanonical: /rel=["']canonical["']/i.test(content), type: 'link_jsx_tag' };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasSchema: false, typesFound: [] };
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { hasSchema: /application\/ld\+json/i.test(content), typesFound: ['JSON-LD'] };
  }

  public findRobotsConfig(projectDir: string): string | null {
    const paths = ['public/robots.txt', 'robots.txt'];
    for (const p of paths) {
      if (fs.existsSync(path.join(projectDir, p))) return p;
    }
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = ['public/sitemap.xml', 'sitemap.xml'];
    for (const p of paths) {
      if (fs.existsSync(path.join(projectDir, p))) return p;
    }
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['public/llms.txt', 'llms.txt'];
    for (const p of paths) {
      if (fs.existsSync(path.join(projectDir, p))) return p;
    }
    return null;
  }
}
