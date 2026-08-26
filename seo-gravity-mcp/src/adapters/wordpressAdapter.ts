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

export class WordPressAdapter implements FrameworkAdapter {
  public id = 'wordpress';
  public name = 'WordPress (Themes & Block FSE)';

  public detect(projectDir: string): boolean {
    return this.detectDetailed(projectDir).matched;
  }

  public detectDetailed(projectDir: string): FrameworkDetectionResult {
    const evidence: string[] = [];
    const hasStyleCss = fs.existsSync(path.join(projectDir, 'style.css'));
    if (hasStyleCss) {
      const styleContent = fs.readFileSync(path.join(projectDir, 'style.css'), 'utf-8');
      if (styleContent.includes('Theme Name:') || styleContent.includes('Theme URI:')) {
        evidence.push('style.css with Theme Name header detected');
      }
    }

    if (fs.existsSync(path.join(projectDir, 'wp-content')) || fs.existsSync(path.join(projectDir, 'wp-config.php'))) {
      evidence.push('WordPress root directory signature detected (wp-content / wp-config.php)');
    }

    if (fs.existsSync(path.join(projectDir, 'functions.php')) && (fs.existsSync(path.join(projectDir, 'index.php')) || fs.existsSync(path.join(projectDir, 'templates')))) {
      evidence.push('functions.php and template hierarchy detected');
    }

    return {
      matched: evidence.length > 0,
      confidence: evidence.length >= 2 ? 0.98 : evidence.length === 1 ? 0.90 : 0.0,
      evidence
    };
  }

  public getProjectInfo(projectDir: string): ProjectFrameworkInfo {
    return {
      framework: 'wordpress',
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

    // Check classic templates
    const templates = [
      { file: 'front-page.php', path: '/' },
      { file: 'index.php', path: '/' },
      { file: 'page.php', path: '/:page_slug' },
      { file: 'single.php', path: '/blog/:post_slug' },
      { file: 'archive.php', path: '/category/:category_slug' }
    ];

    for (const t of templates) {
      const full = path.join(projectDir, t.file);
      if (fs.existsSync(full)) {
        if (!discovered.some(d => d.routePath === t.path)) {
          const content = fs.readFileSync(full, 'utf-8');
          discovered.push({
            routePath: t.path,
            sourceFilePath: t.file,
            isDynamic: t.path.includes(':'),
            dynamicParams: (t.path.match(/:[a-zA-Z0-9_-]+/g) || []).map(p => p.slice(1)),
            routeType: 'page',
            hasMetadataExport: /wp_head\(|<title\b|<meta\s+name/i.test(content),
            hasGenerateMetadata: false,
            hasSchemaMarkup: /application\/ld\+json|schema\.org/i.test(content),
            hasHeadComponent: /wp_head\(/i.test(content),
            isClientComponent: false
          });
        }
      }
    }

    // Check Full Site Editing (FSE) block templates in templates/
    const templatesDir = path.join(projectDir, 'templates');
    if (fs.existsSync(templatesDir)) {
      const entries = fs.readdirSync(templatesDir);
      for (const file of entries) {
        if (file.endsWith('.html')) {
          const base = file.replace(/\.html$/, '');
          const routePath = base === 'index' || base === 'front-page' ? '/' : `/${base}`;
          if (!discovered.some(d => d.routePath === routePath)) {
            const rel = path.join('templates', file).replace(/\\/g, '/');
            const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
            discovered.push({
              routePath,
              sourceFilePath: rel,
              isDynamic: false,
              dynamicParams: [],
              routeType: 'page',
              hasMetadataExport: true,
              hasGenerateMetadata: false,
              hasSchemaMarkup: /schema\.org|application\/ld\+json/i.test(content),
              hasHeadComponent: true,
              isClientComponent: false
            });
          }
        }
      }
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

    // Dynamic patterns
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
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasMetadata: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    const has = /wp_head\(|<title\b|add_theme_support\(['"]title-tag['"]\)/i.test(content);
    return { hasMetadata: has, type: has ? 'jsx_head' : 'none' };
  }

  public async findCanonicalDeclaration(projectDir: string, route: DiscoveredRoute): Promise<CanonicalLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasCanonical: false, type: 'none' };
    const content = fs.readFileSync(full, 'utf-8');
    const has = /rel=["']canonical["']|wp_get_canonical_url/i.test(content);
    return { hasCanonical: has, type: has ? 'link_jsx_tag' : 'none' };
  }

  public async findSchemaDeclaration(projectDir: string, route: DiscoveredRoute): Promise<SchemaLocationInfo> {
    const full = path.join(projectDir, route.sourceFilePath);
    if (!fs.existsSync(full)) return { hasSchema: false, typesFound: [] };
    const content = fs.readFileSync(full, 'utf-8');
    const has = /application\/ld\+json|schema\.org/i.test(content);
    return { hasSchema: has, typesFound: has ? ['JSON-LD'] : [] };
  }

  public findRobotsConfig(projectDir: string): string | null {
    const paths = ['robots.txt', 'public/robots.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findSitemapConfig(projectDir: string): string | null {
    const paths = ['sitemap.xml', 'public/sitemap.xml', 'sitemap_index.xml'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }

  public findLlmsTxt(projectDir: string): string | null {
    const paths = ['llms.txt', 'public/llms.txt'];
    for (const p of paths) if (fs.existsSync(path.join(projectDir, p))) return p;
    return null;
  }
}
