import * as path from 'path';
import { fileURLToPath } from 'url';
import { defaultAdapterRegistry } from '../adapters/adapterRegistry.js';
import { inspectSourceFileAST } from '../utils/astLocator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_ROOT = path.resolve(__dirname, '../../test/fixtures');

export async function runCorrelationBenchmark(): Promise<boolean> {
  console.log('\n📊 Running Multi-Framework Correlation Accuracy Benchmark (17 Frameworks)...\n');

  const frameworksToTest = [
    // 1. Next.js App Router
    {
      id: 'nextjs-app-router',
      dir: 'nextjs-app',
      expectedRoutes: ['/', '/about', '/blog/[slug]', '/sitemap.xml'],
      testUrl: '/blog/ai-seo',
      expectedFile: 'app/blog/[slug]/page.tsx'
    },
    // 2. Next.js Pages Router
    {
      id: 'nextjs-pages-router',
      dir: 'nextjs-pages',
      expectedRoutes: ['/', '/blog/[id]'],
      testUrl: '/blog/123',
      expectedFile: 'pages/blog/[id].tsx'
    },
    // 3. Astro
    {
      id: 'astro',
      dir: 'astro-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'src/pages/index.astro'
    },
    // 4. Vite / React SPA
    {
      id: 'vite-react',
      dir: 'vite-react',
      expectedRoutes: ['/', '/about', '/docs/:slug'],
      testUrl: '/about',
      expectedFile: 'src/App.tsx'
    },
    // 5. Remix
    {
      id: 'remix',
      dir: 'remix-app',
      expectedRoutes: ['/', '/features'],
      testUrl: '/features',
      expectedFile: 'app/routes/features.tsx'
    },
    // 6. SvelteKit
    {
      id: 'sveltekit',
      dir: 'sveltekit-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'src/routes/+page.svelte'
    },
    // 7. Nuxt 3 (Vue SSR)
    {
      id: 'nuxt',
      dir: 'nuxt-app',
      expectedRoutes: ['/', '/blog/[slug]'],
      testUrl: '/blog/super-fast',
      expectedFile: 'pages/blog/[slug].vue'
    },
    // 8. TanStack Router / Start
    {
      id: 'tanstack-start',
      dir: 'tanstack-app',
      expectedRoutes: ['/', '/posts/:postId'],
      testUrl: '/posts/99',
      expectedFile: 'src/routes/posts.$postId.tsx'
    },
    // 9. SolidStart
    {
      id: 'solidstart',
      dir: 'solid-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'src/routes/index.tsx'
    },
    // 10. Qwik City
    {
      id: 'qwik-city',
      dir: 'qwik-app',
      expectedRoutes: ['/', '/docs/[slug]'],
      testUrl: '/docs/getting-started',
      expectedFile: 'src/routes/docs/[slug]/index.tsx'
    },
    // 11. Gatsby
    {
      id: 'gatsby',
      dir: 'gatsby-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'src/pages/index.tsx'
    },
    // 12. WordPress Themes & FSE
    {
      id: 'wordpress',
      dir: 'wordpress-theme',
      expectedRoutes: ['/', '/blog/:post_slug'],
      testUrl: '/blog/hello-world',
      expectedFile: 'single.php'
    },
    // 13. Laravel (Blade & routes/web.php)
    {
      id: 'laravel',
      dir: 'laravel-app',
      expectedRoutes: ['/', '/pricing', '/posts/{slug}'],
      testUrl: '/posts/first-post',
      expectedFile: 'routes/web.php'
    },
    // 14. Symfony (Twig & #[Route])
    {
      id: 'symfony',
      dir: 'symfony-app',
      expectedRoutes: ['/'],
      testUrl: '/',
      expectedFile: 'templates/home.html.twig'
    },
    // 15. Classic Multi-page PHP
    {
      id: 'php-classic',
      dir: 'php-classic',
      expectedRoutes: ['/', '/contact'],
      testUrl: '/contact',
      expectedFile: 'contact.php'
    },
    // 16. Markdown SSGs (Hugo/Jekyll/11ty)
    {
      id: 'ssg-markdown',
      dir: 'ssg-hugo',
      expectedRoutes: ['/posts/first-post'],
      testUrl: '/posts/first-post',
      expectedFile: 'content/posts/first-post.md'
    },
    // 17. Static HTML MPA
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
      inspectSourceFileAST(path.join(projectPath, mapping.sourceFilePath));
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
