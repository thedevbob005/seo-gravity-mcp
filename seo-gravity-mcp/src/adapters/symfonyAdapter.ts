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

export class SymfonyAdapter implements FrameworkAdapter {
  public id = 'symfony';
  public name = 'Symfony (Twig & Routes)';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    const evidence: string[] = [];
    if (fs.existsSync(path.join(projectDir, 'symfony.lock'))) {
      evidence.push('symfony.lock detected');
    }

    const composerPath = path.join(projectDir, 'composer.json');
    if (fs.existsSync(composerPath)) {
      try {
        const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
        const deps = { ...composer.require, ...composer['require-dev'] };
        if (deps['symfony/framework-bundle'] || deps['symfony/symfony']) {
          evidence.push('symfony framework bundle detected in composer.json');
        }
      } catch {}
    }

    return {
      matched: evidence.length > 0,
      confidence: evidence.length >= 2 ? 0.99 : 0.90,
      evidence
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'symfony',
      name: path.basename(projectDir),
      hasTypeScript: false,
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: 'templates',
      devCommand: 'symfony server:start',
      defaultDevPort: 8000
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const discovered: DiscoveredRoute[] = [];

    // Check Twig templates
    const templatesDir = path.join(projectDir, 'templates');
    if (fs.existsSync(templatesDir)) {
      const scanTwig = (dir: string, prefix: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            scanTwig(full, prefix === '/' ? `/${e.name}` : `${prefix}/${e.name}`);
          } else if (e.isFile() && e.name.endsWith('.html.twig')) {
            const base = e.name.replace(/\.html\.twig$/, '');
            const routePath = base === 'index' || base === 'home' ? '/' : (prefix === '/' ? `/${base}` : `${prefix}/${base}`);
            const rel = path.relative(projectDir, full).replace(/\\/g, '/');
            const content = fs.readFileSync(full, 'utf-8');

            discovered.push({
              routePath,
              sourceFilePath: rel,
              isDynamic: false,
              dynamicParams: [],
              routeType: 'page',
              hasMetadataExport: /{% block title %}|<title\b/i.test(content),
              hasGenerateMetadata: false,
              hasSchemaMarkup: /application\/ld\+json/.test(content),
              hasHeadComponent: true,
              isClientComponent: false
            });
          }
        }
      };
      scanTwig(templatesDir, '/');
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
    const has = /{% block title %}|<title\b/i.test(content);
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
