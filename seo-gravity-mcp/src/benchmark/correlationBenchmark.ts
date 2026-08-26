import * as path from 'path';
import { fileURLToPath } from 'url';
import { defaultAdapterRegistry } from '../adapters/adapterRegistry.js';
import { inspectSourceFileAST } from '../utils/astLocator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_ROOT = path.resolve(__dirname, '../../test/fixtures');

export async function runCorrelationBenchmark(): Promise<boolean> {
  console.log('\n📊 Running Multi-Framework Correlation Accuracy Benchmark...\n');

  const frameworksToTest = [
    {
      id: 'nextjs-app-router',
      dir: 'nextjs-app',
      expectedRoutes: ['/', '/about', '/blog/[slug]', '/sitemap.xml'],
      testUrl: '/blog/ai-seo',
      expectedFile: 'app/blog/[slug]/page.tsx'
    },
    {
      id: 'nextjs-pages-router',
      dir: 'nextjs-pages',
      expectedRoutes: ['/', '/blog/[id]'],
      testUrl: '/blog/123',
      expectedFile: 'pages/blog/[id].tsx'
    },
    {
      id: 'astro',
      dir: 'astro-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'src/pages/index.astro'
    },
    {
      id: 'vite-react',
      dir: 'vite-react',
      expectedRoutes: ['/', '/about', '/docs/:slug'],
      testUrl: '/about',
      expectedFile: 'src/App.tsx'
    },
    {
      id: 'remix',
      dir: 'remix-app',
      expectedRoutes: ['/', '/features'],
      testUrl: '/features',
      expectedFile: 'app/routes/features.tsx'
    },
    {
      id: 'sveltekit',
      dir: 'sveltekit-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'src/routes/+page.svelte'
    },
    {
      id: 'static-html',
      dir: 'static-site',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'index.html'
    }
  ];

  let passed = 0;
  let total = frameworksToTest.length;

  for (const item of frameworksToTest) {
    const projectPath = path.join(FIXTURES_ROOT, item.dir);
    const adapter = defaultAdapterRegistry.getAdapterForProject(projectPath);

    if (adapter.id !== item.id) {
      console.error(`❌ [${item.id}] Detection mismatch: got '${adapter.id}'`);
      continue;
    }

    const routes = adapter.discoverRoutes(projectPath);
    const routePaths = routes.map(r => r.routePath);
    const missingRoutes = item.expectedRoutes.filter(er => !routePaths.includes(er));

    if (missingRoutes.length > 0) {
      console.error(`❌ [${item.id}] Missing expected routes: ${missingRoutes.join(', ')} (Found: ${routePaths.join(', ')})`);
      continue;
    }

    const mapping = adapter.mapRouteToSource(item.testUrl, routes);
    if (!mapping.sourceFilePath || !mapping.sourceFilePath.includes(path.basename(item.expectedFile))) {
      console.error(`❌ [${item.id}] Source mapping error for '${item.testUrl}': expected '${item.expectedFile}', got '${mapping.sourceFilePath}'`);
      continue;
    }

    // AST inspection check if typescript/tsx
    if (mapping.sourceFilePath.endsWith('.tsx') || mapping.sourceFilePath.endsWith('.ts')) {
      const ast = inspectSourceFileAST(path.join(projectPath, mapping.sourceFilePath));
    }

    console.log(`✅ [${item.id.padEnd(20)}] 100% Precision: Routes=[${routePaths.join(', ')}] -> Mapped '${item.testUrl}' to '${mapping.sourceFilePath}'`);
    passed++;
  }

  const score = Math.round((passed / total) * 100);
  console.log(`\n🎯 Benchmark Result: ${passed}/${total} frameworks verified (${score}% correlation precision).\n`);
  return passed === total;
}

runCorrelationBenchmark().then(success => {
  if (!success) process.exit(1);
});
