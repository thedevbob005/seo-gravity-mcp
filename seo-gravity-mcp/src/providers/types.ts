import {
  SerpAnalysisResponse,
  PageSpeedAuditReport,
  EntitySalienceItem
} from '../types/seo.js';

export interface SERPProvider {
  id: string;
  name: string;
  isFree: boolean;
  analyzeSerp(query: string, country?: string, language?: string, numResults?: number): Promise<SerpAnalysisResponse>;
}

export interface PageSpeedProvider {
  id: string;
  name: string;
  audit(url: string, strategy?: 'mobile' | 'desktop'): Promise<PageSpeedAuditReport>;
}

export interface KnowledgeProvider {
  id: string;
  name: string;
  extractEntities(text: string): Promise<EntitySalienceItem[]>;
}

export interface IndexingProvider {
  id: string;
  name: string;
  submitUrls(host: string, key: string, keyLocation: string, urls: string[]): Promise<any>;
}
