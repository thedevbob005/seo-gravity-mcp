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

export class PhpClassicAdapter implements FrameworkAdapter {
  public id = 'php-classic';
  public name = 'Classic Multi-Page PHP';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    // Exclude if WordPress, Laravel, or Symfony detected
    const isWp = fs.existsSync(path.join(projectDir, 'wp-content')) || fs.existsSync(path.join(projectDir, 'wp-config.php'));
    const isLaravel = fs.existsSync(path.join(projectDir, 'artisan'));
    const isSymfony = fs.existsSync(path.join(projectDir, 'symfony.lock'));

    if (isWp || isLaravel || isSymfony) {
      return { matched: false, confidence: 0, evidence: [] };
    }

    let phpFileCount = 0;
    try {
      const entries = fs.readdirSync(projectDir);
      for (const e of entries) {
        if (e.endsWith('.php')) phpFileCount++;
      }
    } catch {}

    const matched = phpFileCount > 0;
    return {
      matched,
      confidence: matched ? 0.85 : 0.0,
      evidence: matched ? [`Found ${phpFileCount} top-level .php files`] : []
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'php-classic',
      name: path.basename(projectDir),
      hasTypeScript: false,
      hasSitemapConfig: Boolean(this.findSitemapConfig(projectDir)),
      hasRobotsConfig: Boolean(this.findRobotsConfig(projectDir)),
      hasLlmsTxt: Boolean(this.findLlmsTxt(projectDir)),
      rootDir: path.resolve(projectDir),
      routesDir: '.',
      defaultDevPort: 8000
    };
  }

  public discoverRoutes(projectDir: string): DiscoveredRoute[] {
    const discovered: DiscoveredRoute[] = [];
    const scan = (dir: string, prefix: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (['node_modules', '.git', 'vendor'].includes(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          scan(full, prefix === '/' ? `/${e.name}` : `${prefix}/${e.name}`);
        } else if (e.isFile() && e.name.endsWith('.php')) {
          const base = e.name.replace(/\.php$/, '');
          const routePath = base === 'index' ? prefix : (prefix === '/' ? `/${base}` : `${prefix}/${base}`);
          const rel = path.relative(projectDir, full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf-8');

          discovered.push({
            routePath: routePath === '' ? '/' : routePath,
            sourceFilePath: rel,
            isDynamic: false,
            dynamicParams: [],
            routeType: 'page',
            hasMetadataExport: /<title\b|<meta\s+name/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json/.test(content),
            hasHeadComponent: /<head\b|<title\b/i.test(content),
            isClientComponent: false
          });
        }
      }
    };

    scan(projectDir, '/');
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
    const has = /<title\b|<meta\s+name/i.test(content);
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
    const paths = ['robots.txt', 'public/robots.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = ['sitemap.xml', 'public/sitemap.xml'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['llms.txt', 'public/llms.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }
}
