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

export class NuxtAdapter implements FrameworkAdapter {
  public id = 'nuxt';
  public name = 'Nuxt 3 (Vue SSR)';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    const evidence: string[] = [];
    if (fs.existsSync(path.join(projectDir, 'nuxt.config.ts')) || fs.existsSync(path.join(projectDir, 'nuxt.config.js'))) {
      evidence.push('nuxt.config detected');
    }

    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['nuxt'] || deps['nuxt3']) evidence.push('nuxt package dependency detected');
      } catch {}
    }

    return {
      matched: evidence.length > 0,
      confidence: evidence.length >= 2 ? 0.99 : 0.92,
      evidence
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    const pkgPath = path.join(projectDir, 'package.json');
    let pkg: any = {};
    if (fs.existsSync(pkgPath)) {
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      } catch {}
    }

    const hasSrcPages = fs.existsSync(path.join(projectDir, 'src/pages'));
    const routesDir = hasSrcPages ? 'src/pages' : 'pages';

    return {
      framework: 'nuxt',
      name: pkg.name || path.basename(projectDir),
      version: pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt,
      packageManager: 'npm',
      hasTypeScript: fs.existsSync(path.join(projectDir, 'tsconfig.json')),
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir,
      devCommand: 'npm run dev',
      defaultDevPort: 3000
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const info = this.getProjectInfo(projectDir);
    const fullRoutesDir = path.join(projectDir, info.routesDir || 'pages');
    const discovered: DiscoveredRoute[] = [];

    if (!fs.existsSync(fullRoutesDir)) return discovered;

    const scanDir = (currentDir: string, routePrefix: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          const nextPrefix = routePrefix === '/' ? `/${entry.name}` : `${routePrefix}/${entry.name}`;
          scanDir(entryPath, nextPrefix);
        } else if (entry.isFile() && entry.name.endsWith('.vue')) {
          const baseName = entry.name.replace(/\.vue$/, '');
          let routePath = routePrefix;
          if (baseName !== 'index') {
            routePath = routePrefix === '/' ? `/${baseName}` : `${routePrefix}/${baseName}`;
          }
          if (routePath === '') routePath = '/';

          const relFile = path.relative(projectDir, entryPath).replace(/\\/g, '/');
          const content = fs.readFileSync(entryPath, 'utf-8');
          const isDynamic = routePath.includes('[');
          const dynamicParams = (routePath.match(/\[([a-zA-Z0-9_-]+)\]/g) || []).map(p => p.slice(1, -1));

          discovered.push({
            routePath,
            sourceFilePath: relFile,
            isDynamic,
            dynamicParams,
            routeType: 'page',
            hasMetadataExport: /useHead\(|useSeoMeta\(|definePageMeta\(|<title\b/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /useSchemaOrg\(|application\/ld\+json/.test(content),
            hasHeadComponent: /useHead\(|useSeoMeta\(|<Head\b/i.test(content),
            isClientComponent: false
          });
        }
      }
    };

    scanDir(fullRoutesDir, '/');
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

    // Dynamic patterns [slug]
    for (const r of routes) {
      if (!r.isDynamic) continue;
      const regexStr = '^' + r.routePath
        .replace(/\[\.\.\.([a-zA-Z0-9_-]+)\]/g, '.*')
        .replace(/\[([a-zA-Z0-9_-]+)\]/g, '[^/]+') + '$';
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
    const has = /useHead\(|useSeoMeta\(|definePageMeta\(|<title\b/i.test(content);
    return { hasMetadata: has, type: has ? 'static_export' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    return { hasCanonical: /canonical/.test(content), type: 'metadata_property' };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasSchema: false, typesFound: [] };
    const content = fs.readFileSync(full, 'utf-8');
    const has = /useSchemaOrg\(|application\/ld\+json/i.test(content);
    return { hasSchema: has, typesFound: has ? ['JSON-LD'] : [] };
  }

  public findRobotsConfig(projectDir: string): string | null {
    const paths = ['public/robots.txt', 'robots.txt', 'server/routes/robots.txt.ts'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = ['public/sitemap.xml', 'sitemap.xml', 'server/routes/sitemap.xml.ts'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['public/llms.txt', 'llms.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }
}
