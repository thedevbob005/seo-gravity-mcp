import {
  SERPProvider,
  PageSpeedProvider,
  KnowledgeProvider,
  IndexingProvider
} from './types.js';
import { analyzeSerp } from '../tools/serp.js';
import { auditPageSpeed, submitIndexNow } from '../tools/performance.js';
import { mapEntitySalience } from '../tools/schema.js';

export class NativeSerpProvider implements SERPProvider {
  public id = 'native_google_scraper';
  public name = 'Native Web SERP Scraper';
  public isFree = true;

  public async analyzeSerp(query: string, country = 'us', language = 'en', numResults = 10) {
    return analyzeSerp(query, country, language, numResults);
  }
}

export class NativePageSpeedProvider implements PageSpeedProvider {
  public id = 'native_pagespeed';
  public name = 'Native Core Web Vitals Analyzer';

  public async audit(url: string, strategy: 'mobile' | 'desktop' = 'mobile') {
    return auditPageSpeed(url, strategy);
  }
}

export class NativeKnowledgeProvider implements KnowledgeProvider {
  public id = 'native_nlp';
  public name = 'Native Entity Salience NLP Engine';

  public async extractEntities(text: string) {
    const res = await mapEntitySalience(text);
    return res.topEntities;
  }
}

export class NativeIndexingProvider implements IndexingProvider {
  public id = 'native_indexnow';
  public name = 'IndexNow Protocol Provider';

  public async submitUrls(host: string, key: string, keyLocation: string, urls: string[]) {
    return submitIndexNow(host, key, keyLocation, urls);
  }
}

export class ProviderRegistry {
  private serpProvider: SERPProvider = new NativeSerpProvider();
  private pageSpeedProvider: PageSpeedProvider = new NativePageSpeedProvider();
  private knowledgeProvider: KnowledgeProvider = new NativeKnowledgeProvider();
  private indexingProvider: IndexingProvider = new NativeIndexingProvider();

  public getSerpProvider(): SERPProvider {
    return this.serpProvider;
  }
  public setSerpProvider(provider: SERPProvider): void {
    this.serpProvider = provider;
  }

  public getPageSpeedProvider(): PageSpeedProvider {
    return this.pageSpeedProvider;
  }
  public setPageSpeedProvider(provider: PageSpeedProvider): void {
    this.pageSpeedProvider = provider;
  }

  public getKnowledgeProvider(): KnowledgeProvider {
    return this.knowledgeProvider;
  }
  public setKnowledgeProvider(provider: KnowledgeProvider): void {
    this.knowledgeProvider = provider;
  }

  public getIndexingProvider(): IndexingProvider {
    return this.indexingProvider;
  }
  public setIndexingProvider(provider: IndexingProvider): void {
    this.indexingProvider = provider;
  }
}

export const defaultProviderRegistry = new ProviderRegistry();
