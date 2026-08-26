import { FrameworkAdapter } from './types.js';
import { NextAppAdapter } from './nextAppAdapter.js';
import { NextPagesAdapter } from './nextPagesAdapter.js';
import { AstroAdapter } from './astroAdapter.js';
import { RemixAdapter } from './remixAdapter.js';
import { SvelteKitAdapter } from './svelteKitAdapter.js';
import { NuxtAdapter } from './nuxtAdapter.js';
import { TanStackRouterAdapter } from './tanStackRouterAdapter.js';
import { SolidStartAdapter } from './solidStartAdapter.js';
import { QwikCityAdapter } from './qwikCityAdapter.js';
import { GatsbyAdapter } from './gatsbyAdapter.js';
import { WordPressAdapter } from './wordpressAdapter.js';
import { LaravelAdapter } from './laravelAdapter.js';
import { SymfonyAdapter } from './symfonyAdapter.js';
import { PhpClassicAdapter } from './phpClassicAdapter.js';
import { SsgAdapter } from './ssgAdapter.js';
import { ViteReactAdapter } from './viteReactAdapter.js';
import { StaticAdapter } from './staticAdapter.js';
import { UnknownAdapter } from './unknownAdapter.js';

export class AdapterRegistry {
  private unknownAdapter = new UnknownAdapter();
  private adapters: FrameworkAdapter[] = [
    // Specialized JS/TS Frameworks
    new NextAppAdapter(),
    new NextPagesAdapter(),
    new AstroAdapter(),
    new RemixAdapter(),
    new SvelteKitAdapter(),
    new NuxtAdapter(),
    new TanStackRouterAdapter(),
    new SolidStartAdapter(),
    new QwikCityAdapter(),
    new GatsbyAdapter(),

    // PHP & CMS Frameworks
    new WordPressAdapter(),
    new LaravelAdapter(),
    new SymfonyAdapter(),
    new PhpClassicAdapter(),

    // Static Site Generators & SPAs
    new SsgAdapter(),
    new ViteReactAdapter(),

    // Static HTML Sites
    new StaticAdapter()
  ];

  public getAdapterForProject(projectDir: string): FrameworkAdapter {
    for (const adapter of this.adapters) {
      if (adapter.detect(projectDir)) {
        return adapter;
      }
    }
    return this.unknownAdapter;
  }

  public getAdapterById(id: string): FrameworkAdapter | undefined {
    if (id === 'unknown') return this.unknownAdapter;
    return this.adapters.find(a => a.id === id);
  }

  public getAllAdapters(): FrameworkAdapter[] {
    return [...this.adapters];
  }
}

export const defaultAdapterRegistry = new AdapterRegistry();
