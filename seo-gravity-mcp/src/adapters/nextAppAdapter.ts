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
import { inspectSourceFileAST } from '../utils/astLocator.js';

export class NextAppAdapter implements FrameworkAdapter {
  public id = 'nextjs-app-router';
  public name = 'Next.js App Router';

  public detect(projectDir: string): boolean {
    const hasPkg = fs.existsSync(path.join(projectDir, 'package.json'));
    if (!hasPkg) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (!deps['next']) return false;
      return (
        (fs.existsSync(path.join(projectDir, 'app')) && fs.statSync(path.join(projectDir, 'app')).isDirectory()) ||
        (fs.existsSync(path.join(projectDir, 'src/app')) && fs.statSync(path.join(projectDir, 'src/app')).isDirectory())
      );
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

    const hasSrcApp = fs.existsSync(path.join(projectDir, 'src/app'));
    const routesDir = hasSrcApp ? 'src/app' : 'app';

    return {
      framework: 'nextjs-app-router',
      name: pkg.name || path.basename(projectDir),
      version: pkg.dependencies?.next || pkg.devDependencies?.next,
      packageManager: fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))
        ? 'pnpm'
        : fs.existsSync(path.join(projectDir, 'yarn.lock'))
        ? 'yarn'
        : 'npm',
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
    const fullRoutesDir = path.join(projectDir, info.routesDir || 'app');
    const discovered: DiscoveredRoute[] = [];

    if (!fs.existsSync(fullRoutesDir)) return discovered;

    const scanDir = (currentDir: string, routePrefix: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          const segment = entry.name.startsWith('(') && entry.name.endsWith(')') ? '' : entry.name;
          const nextPrefix = segment ? (routePrefix === '/' ? `/${segment}` : `${routePrefix}/${segment}`) : routePrefix;
          scanDir(entryPath, nextPrefix);
        } else if (entry.isFile()) {
          if (/^page\.(tsx|jsx|js|ts)$/.test(entry.name)) {
            const relFile = path.relative(projectDir, entryPath).replace(/\\/g, '/');
            const routePath = routePrefix === '' ? '/' : routePrefix;
            const dynamicParams = this.extractDynamicParams(routePath);
            const astInfo = inspectSourceFileAST(entryPath);

            discovered.push({
              routePath,
              sourceFilePath: relFile,
              isDynamic: dynamicParams.length > 0,
              dynamicParams,
              routeType: 'page',
              hasMetadataExport: astInfo.hasMetadataExport,
              hasGenerateMetadata: astInfo.hasGenerateMetadata,
              hasSchemaMarkup: astInfo.hasSchemaMarkup,
              hasHeadComponent: false,
              isClientComponent: /['"]use client['"]/.test(fs.readFileSync(entryPath, 'utf-8')),
              astSourceRange: astInfo.metadataRange
            });
          } else if (/^sitemap\.(ts|js|xml)$/.test(entry.name)) {
            const relFile = path.relative(projectDir, entryPath).replace(/\\/g, '/');
            discovered.push({
              routePath: '/sitemap.xml',
              sourceFilePath: relFile,
              isDynamic: false,
              dynamicParams: [],
              routeType: 'sitemap',
              hasMetadataExport: false,
              hasGenerateMetadata: false,
              hasSchemaMarkup: false,
              hasHeadComponent: false,
              isClientComponent: false
            });
          } else if (/^robots\.(ts|js|txt)$/.test(entry.name)) {
            const relFile = path.relative(projectDir, entryPath).replace(/\\/g, '/');
            discovered.push({
              routePath: '/robots.txt',
              sourceFilePath: relFile,
              isDynamic: false,
              dynamicParams: [],
              routeType: 'robots',
              hasMetadataExport: false,
              hasGenerateMetadata: false,
              hasSchemaMarkup: false,
              hasHeadComponent: false,
              isClientComponent: false
            });
          }
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
          sourceRange: r.astSourceRange,
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
            sourceRange: r.astSourceRange,
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
    const ast = inspectSourceFileAST(fullPath);
    if (ast.hasMetadataExport) {
      return {
        hasMetadata: true,
        type: 'static_export',
        sourceRange: ast.metadataRange,
        titleSnippet: ast.extractedTitle,
        descriptionSnippet: ast.extractedDescription
      };
    }
    if (ast.hasGenerateMetadata) {
      return {
        hasMetadata: true,
        type: 'dynamic_function',
        sourceRange: ast.metadataRange
      };
    }
    return { hasMetadata: false, type: 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    const ast = inspectSourceFileAST(fullPath);
    if (ast.hasCanonicalDeclaration) {
      return {
        hasCanonical: true,
        type: 'metadata_property',
        canonicalUrl: ast.extractedCanonical,
        sourceRange: ast.canonicalRange
      };
    }
    return { hasCanonical: false, type: 'none' };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const fullPath = path.join(projectDir, route.sourceFilePath);
    const ast = inspectSourceFileAST(fullPath);
    return {
      hasSchema: ast.hasSchemaMarkup,
      typesFound: ast.hasSchemaMarkup ? ['JSON-LD'] : [],
      sourceRange: ast.schemaRange
    };
  }

  public findRobotsConfig(projectDir: string): string | null {
    const paths = [
      'app/robots.ts',
      'app/robots.js',
      'src/app/robots.ts',
      'src/app/robots.js',
      'public/robots.txt',
      'robots.txt'
    ];
    for (const p of paths) {
      if (fs.existsSync(path.join(projectDir, p))) return p;
    }
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = [
      'app/sitemap.ts',
      'app/sitemap.js',
      'src/app/sitemap.ts',
      'src/app/sitemap.js',
      'public/sitemap.xml',
      'sitemap.xml'
    ];
    for (const p of paths) {
      if (fs.existsSync(path.join(projectDir, p))) return p;
    }
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['public/llms.txt', 'llms.txt', 'public/llms-full.txt', 'llms-full.txt'];
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
