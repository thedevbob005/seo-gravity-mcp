import * as fs from 'fs';
import * as path from 'path';
import {
  ProjectFrameworkInfo,
  SupportedFramework,
  DiscoveredRoute,
  RouteSourceMapping
} from '../types/findings.js';

export function detectFramework(projectDir: string): ProjectFrameworkInfo {
  const resolvedDir = path.resolve(projectDir);
  const pkgPath = path.join(resolvedDir, 'package.json');

  let pkg: any = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      // Ignored
    }
  }

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {})
  };

  const hasFile = (relPath: string) => fs.existsSync(path.join(resolvedDir, relPath));
  const hasDir = (relPath: string) => {
    const p = path.join(resolvedDir, relPath);
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  };

  let framework: SupportedFramework = 'unknown';
  let routesDir: string | undefined;
  let devCommand = pkg.scripts?.dev ? 'npm run dev' : undefined;
  let defaultDevPort = 3000;

  // Next.js App Router vs Pages Router
  if (allDeps['next']) {
    if (hasDir('app') || hasDir('src/app')) {
      framework = 'nextjs-app-router';
      routesDir = hasDir('app') ? 'app' : 'src/app';
    } else {
      framework = 'nextjs-pages-router';
      routesDir = hasDir('pages') ? 'pages' : 'src/pages';
    }
    defaultDevPort = 3000;
  }
  // Astro
  else if (allDeps['astro'] || hasFile('astro.config.mjs') || hasFile('astro.config.ts')) {
    framework = 'astro';
    routesDir = hasDir('src/pages') ? 'src/pages' : 'pages';
    defaultDevPort = 4321;
  }
  // Remix
  else if (allDeps['@remix-run/react'] || allDeps['@remix-run/node']) {
    framework = 'remix';
    routesDir = hasDir('app/routes') ? 'app/routes' : 'routes';
    defaultDevPort = 3000;
  }
  // SvelteKit
  else if (allDeps['@sveltejs/kit']) {
    framework = 'sveltekit';
    routesDir = hasDir('src/routes') ? 'src/routes' : 'routes';
    defaultDevPort = 5173;
  }
  // Nuxt
  else if (allDeps['nuxt'] || allDeps['nuxt3']) {
    framework = 'nuxt';
    routesDir = hasDir('pages') ? 'pages' : 'src/pages';
    defaultDevPort = 3000;
  }
  // Vite / React SPA
  else if (allDeps['vite'] || allDeps['react']) {
    framework = 'vite-react';
    routesDir = hasDir('src') ? 'src' : '.';
    defaultDevPort = 5173;
  }
  // Static HTML
  else if (hasFile('index.html')) {
    framework = 'static-html';
    routesDir = '.';
    defaultDevPort = 8080;
  }

  // Detect sitemap, robots, llms.txt
  const hasSitemapConfig =
    hasFile('public/sitemap.xml') ||
    hasFile('sitemap.xml') ||
    hasFile('app/sitemap.ts') ||
    hasFile('app/sitemap.js') ||
    hasFile('src/app/sitemap.ts') ||
    hasFile('src/app/sitemap.js') ||
    hasFile('src/pages/sitemap.xml.ts');

  const hasRobotsConfig =
    hasFile('public/robots.txt') ||
    hasFile('robots.txt') ||
    hasFile('app/robots.ts') ||
    hasFile('app/robots.js') ||
    hasFile('src/app/robots.ts') ||
    hasFile('src/app/robots.js');

  const hasLlmsTxt =
    hasFile('public/llms.txt') ||
    hasFile('llms.txt') ||
    hasFile('public/llms-full.txt') ||
    hasFile('llms-full.txt');

  const hasTypeScript =
    hasFile('tsconfig.json') ||
    Boolean(allDeps['typescript']);

  // Package manager detection
  let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
  if (hasFile('pnpm-lock.yaml')) packageManager = 'pnpm';
  else if (hasFile('yarn.lock')) packageManager = 'yarn';
  else if (hasFile('bun.lockb')) packageManager = 'bun';

  return {
    framework,
    name: pkg.name || path.basename(resolvedDir),
    version: pkg.version,
    packageManager,
    hasTypeScript,
    hasSitemapConfig,
    hasRobotsConfig,
    hasLlmsTxt,
    rootDir: resolvedDir,
    routesDir,
    devCommand,
    defaultDevPort
  };
}

export function discoverRoutes(projectDir: string, frameworkInfo?: ProjectFrameworkInfo): DiscoveredRoute[] {
  const resolvedDir = path.resolve(projectDir);
  const info = frameworkInfo || detectFramework(resolvedDir);
  const discovered: DiscoveredRoute[] = [];

  if (!info.routesDir) return discovered;
  const fullRoutesDir = path.join(resolvedDir, info.routesDir);
  if (!fs.existsSync(fullRoutesDir)) return discovered;

  const readRouteFileContent = (relFile: string): {
    hasMetadataExport: boolean;
    hasGenerateMetadata: boolean;
    hasSchemaMarkup: boolean;
    hasHeadComponent: boolean;
    isClientComponent: boolean;
  } => {
    try {
      const fullPath = path.join(resolvedDir, relFile);
      const content = fs.readFileSync(fullPath, 'utf-8');
      return {
        hasMetadataExport: /export\s+const\s+metadata\b/.test(content),
        hasGenerateMetadata: /export\s+(async\s+)?function\s+generateMetadata\b/.test(content),
        hasSchemaMarkup: /application\/ld\+json/.test(content) || /schema\.org/.test(content),
        hasHeadComponent: /<Head\b|<Helmet\b|astro:head|<meta\b|<title\b/.test(content),
        isClientComponent: /['"]use client['"]/.test(content)
      };
    } catch {
      return {
        hasMetadataExport: false,
        hasGenerateMetadata: false,
        hasSchemaMarkup: false,
        hasHeadComponent: false,
        isClientComponent: false
      };
    }
  };

  // Next.js App Router Scanner
  if (info.framework === 'nextjs-app-router') {
    const scanAppDir = (currentDir: string, routePrefix: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          // Ignore route groups like (marketing) in path
          const segment = entry.name.startsWith('(') && entry.name.endsWith(')') ? '' : entry.name;
          const nextPrefix = segment ? (routePrefix === '/' ? `/${segment}` : `${routePrefix}/${segment}`) : routePrefix;
          scanAppDir(entryPath, nextPrefix);
        } else if (entry.isFile()) {
          if (/^page\.(tsx|jsx|js|ts)$/.test(entry.name)) {
            const relFile = path.relative(resolvedDir, entryPath).replace(/\\/g, '/');
            const routePath = routePrefix === '' ? '/' : routePrefix;
            const dynamicParams = extractDynamicParams(routePath);
            const meta = readRouteFileContent(relFile);

            discovered.push({
              routePath,
              sourceFilePath: relFile,
              isDynamic: dynamicParams.length > 0,
              dynamicParams,
              routeType: 'page',
              ...meta
            });
          } else if (/^sitemap\.(ts|js|xml)$/.test(entry.name)) {
            const relFile = path.relative(resolvedDir, entryPath).replace(/\\/g, '/');
            discovered.push({
              routePath: '/sitemap.xml',
              sourceFilePath: relFile,
              isDynamic: false,
              dynamicParams: [],
              routeType: 'sitemap',
              ...readRouteFileContent(relFile)
            });
          } else if (/^robots\.(ts|js|txt)$/.test(entry.name)) {
            const relFile = path.relative(resolvedDir, entryPath).replace(/\\/g, '/');
            discovered.push({
              routePath: '/robots.txt',
              sourceFilePath: relFile,
              isDynamic: false,
              dynamicParams: [],
              routeType: 'robots',
              ...readRouteFileContent(relFile)
            });
          }
        }
      }
    };

    scanAppDir(fullRoutesDir, '/');
  }
  // Astro Scanner
  else if (info.framework === 'astro') {
    const scanAstroDir = (currentDir: string, routePrefix: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          const nextPrefix = routePrefix === '/' ? `/${entry.name}` : `${routePrefix}/${entry.name}`;
          scanAstroDir(entryPath, nextPrefix);
        } else if (entry.isFile() && (entry.name.endsWith('.astro') || entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
          const baseName = entry.name.replace(/\.(astro|md|mdx)$/, '');
          let routePath = routePrefix;
          if (baseName !== 'index') {
            routePath = routePrefix === '/' ? `/${baseName}` : `${routePrefix}/${baseName}`;
          }
          if (routePath === '') routePath = '/';

          const relFile = path.relative(resolvedDir, entryPath).replace(/\\/g, '/');
          const dynamicParams = extractDynamicParams(routePath);
          const meta = readRouteFileContent(relFile);

          discovered.push({
            routePath,
            sourceFilePath: relFile,
            isDynamic: dynamicParams.length > 0,
            dynamicParams,
            routeType: 'page',
            ...meta
          });
        }
      }
    };

    scanAstroDir(fullRoutesDir, '/');
  }
  // Pages Router / Nuxt / SvelteKit / Static
  else {
    const scanGenericDir = (currentDir: string, routePrefix: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) continue;
          const nextPrefix = routePrefix === '/' ? `/${entry.name}` : `${routePrefix}/${entry.name}`;
          scanGenericDir(entryPath, nextPrefix);
        } else if (entry.isFile() && /\.(tsx|jsx|js|ts|vue|svelte|html)$/.test(entry.name)) {
          const baseName = entry.name.replace(/\.(tsx|jsx|js|ts|vue|svelte|html)$/, '');
          let routePath = routePrefix;
          if (baseName !== 'index' && baseName !== 'page') {
            routePath = routePrefix === '/' ? `/${baseName}` : `${routePrefix}/${baseName}`;
          }
          if (routePath === '') routePath = '/';

          const relFile = path.relative(resolvedDir, entryPath).replace(/\\/g, '/');
          const dynamicParams = extractDynamicParams(routePath);
          const meta = readRouteFileContent(relFile);

          discovered.push({
            routePath,
            sourceFilePath: relFile,
            isDynamic: dynamicParams.length > 0,
            dynamicParams,
            routeType: 'page',
            ...meta
          });
        }
      }
    };

    scanGenericDir(fullRoutesDir, '/');
  }

  return discovered;
}

function extractDynamicParams(routePath: string): string[] {
  const params: string[] = [];
  const matches = routePath.match(/\[\.{0,3}([a-zA-Z0-9_-]+)\]/g);
  if (matches) {
    for (const m of matches) {
      params.push(m.replace(/[\[\].]/g, ''));
    }
  }
  return params;
}

export function mapUrlToRouteSource(
  targetUrl: string,
  discoveredRoutes: DiscoveredRoute[]
): RouteSourceMapping {
  let urlPath = targetUrl;
  try {
    if (targetUrl.startsWith('http')) {
      urlPath = new URL(targetUrl).pathname;
    }
  } catch {
    urlPath = targetUrl;
  }

  urlPath = urlPath.replace(/\/$/, '') || '/';

  // 1. Exact Match
  for (const r of discoveredRoutes) {
    const cleanRoute = r.routePath.replace(/\/$/, '') || '/';
    if (cleanRoute === urlPath) {
      return {
        urlPath,
        matchedRoute: r,
        sourceFilePath: r.sourceFilePath,
        confidence: 1.0,
        resolutionMethod: 'exact_match'
      };
    }
  }

  // 2. Dynamic Pattern Match (e.g. /blog/my-post -> /blog/[slug])
  for (const r of discoveredRoutes) {
    if (!r.isDynamic) continue;
    const regexStr = '^' + r.routePath
      .replace(/\[\.\.\.([a-zA-Z0-9_-]+)\]/g, '.*')
      .replace(/\[([a-zA-Z0-9_-]+)\]/g, '[^/]+') + '$';

    try {
      const reg = new RegExp(regexStr);
      if (reg.test(urlPath)) {
        return {
          urlPath,
          matchedRoute: r,
          sourceFilePath: r.sourceFilePath,
          confidence: 0.9,
          resolutionMethod: 'pattern_match'
        };
      }
    } catch {
      // Ignored
    }
  }

  // 3. Fallback Heuristic
  const segments = urlPath.split('/').filter(Boolean);
  if (segments.length > 0) {
    const parentSegment = `/${segments[0]}`;
    const parentRoute = discoveredRoutes.find(r => r.routePath.startsWith(parentSegment));
    if (parentRoute) {
      return {
        urlPath,
        matchedRoute: parentRoute,
        sourceFilePath: parentRoute.sourceFilePath,
        confidence: 0.6,
        resolutionMethod: 'fallback_heuristic'
      };
    }
  }

  return {
    urlPath,
    confidence: 0.0,
    resolutionMethod: 'unmapped'
  };
}
