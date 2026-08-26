import { FrameworkAdapter } from './types.js';
import { NextAppAdapter } from './nextAppAdapter.js';
import { NextPagesAdapter } from './nextPagesAdapter.js';
import { AstroAdapter } from './astroAdapter.js';
import { ViteReactAdapter } from './viteReactAdapter.js';
import { RemixAdapter } from './remixAdapter.js';
import { SvelteKitAdapter } from './svelteKitAdapter.js';
import { StaticAdapter } from './staticAdapter.js';

export class AdapterRegistry {
  private adapters: FrameworkAdapter[] = [
    new NextAppAdapter(),
    new NextPagesAdapter(),
    new AstroAdapter(),
    new RemixAdapter(),
    new SvelteKitAdapter(),
    new ViteReactAdapter(),
    new StaticAdapter() // fallback
  ];

  public getAdapterForProject(projectDir: string): FrameworkAdapter {
    for (const adapter of this.adapters) {
      if (adapter.detect(projectDir)) {
        return adapter;
      }
    }
    return this.adapters[this.adapters.length - 1]; // fallback static
  }

  public getAdapterById(id: string): FrameworkAdapter | undefined {
    return this.adapters.find(a => a.id === id);
  }
}

export const defaultAdapterRegistry = new AdapterRegistry();
