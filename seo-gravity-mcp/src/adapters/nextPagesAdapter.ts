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

export class NextPagesAdapter implements FrameworkAdapter {
  public id = 'nextjs-pages-router';
  public name = 'Next.js Pages Router';

  public detect(projectDir: string): boolean {
    const hasPkg = fs.existsSync(path.join(projectDir, 'package.json'));
    if (!hasPkg) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (!deps['next']) return false;
      const hasPages = fs.existsSync(path.join(projectDir, 'pages')) || fs.existsSync(path.join(projectDir, 'src/pages'));
      const hasApp = fs.existsSync(path.join(projectDir, 'app')) || fs.existsSync(path.join(projectDir, 'src/app'));
      return hasPages && !hasApp;
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

    const hasSrcPages = fs.existsSync(path.join(projectDir, 'src/pages'));
    const routesDir = hasSrcPages ? 'src/pages' : 'pages';

    return {
      framework: 'nextjs-pages-router',
      name: pkg.name || path.basename(projectDir),
      version: pkg.dependencies?.next || pkg.devDependencies?.next,
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
          if (entry.name === 'api') continue;
          const nextPrefix = routePrefix === '/' ? `/${entry.name}` : `${routePrefix}/${entry.name}`;
          scanDir(entryPath, nextPrefix);
        } else if (entry.isFile() && /\.(tsx|jsx|js|ts)$/.test(entry.name)) {
          if (entry.name.startsWith('_')) continue;
          const baseName = entry.name.replace(/\.(tsx|jsx|js|ts)$/, '');
          let routePath = routePrefix;
          if (baseName !== 'index') {
            routePath = routePrefix === '/' ? `/${baseName}` : `${routePrefix}/${baseName}`;
          }
          if (routePath === '') routePath = '/';

          const relFile = path.relative(projectDir, entryPath).replace(/\\/g, '/');
          const content = fs.readFileSync(entryPath, 'utf-8');
          const dynamicParams = this.extractDynamicParams(routePath);

          discovered.push({
            routePath,
            sourceFilePath: relFile,
            isDynamic: dynamicParams.length > 0,
            dynamicParams,
            routeType: 'page',
            hasMetadataExport: /<Head\b|<title\b|<NextSeo\b/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json/.test(content),
            hasHeadComponent: /<Head\b|<NextSeo\b/i.test(content),
            isClientComponent: false
          });
        }
      }
    };

    scanDir(fullRoutesDir, '/');
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

    for (const r of routes) {
      const clean = r.routePath.replace(/\/$/, '') || '/';
      if (clean === urlPath) {
        return {
          urlPath,
          matchedRoute: r,
          sourceFilePath: r.sourceFilePath,
          confidence: 1.0,
          resolutionMethod: 'exact_match'
        };
      }
    }

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
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasMetadata: false, type: 'none' };
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasHead = /<Head\b|<NextSeo\b|<title\b/i.test(content);
    return {
      hasMetadata: hasHead,
      type: hasHead ? 'jsx_head' : 'none'
    };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      hasCanonical: /rel=["']canonical["']/i.test(content),
      type: /rel=["']canonical["']/i.test(content) ? 'link_jsx_tag' : 'none'
    };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(fullPath)) return { hasSchema: false, typesFound: [] };
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      hasSchema: /application\/ld\+json/i.test(content),
      typesFound: /application\/ld\+json/i.test(content) ? ['JSON-LD'] : []
    };
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

  private extractDynamicParams(routePath: string): string[] {
    const params: string[] = [];
    const matches = routePath.match(/\[\.{0,3}([a-zA-Z0-9_-]+)\]/g);
    if (matches) {
      for (const m of matches) {
        params.push(m.replace(/[\[\].]/g, ''));
      }
    }
    return params;
  }
}
