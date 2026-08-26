import { DiscoveredRoute } from '../types/findings.js';
import { getProjectAdapter } from './projectScanner.js';
import * as path from 'path';

export interface SEOpportunity {
  id: string;
  category: 'content_expansion' | 'entity_coverage' | 'schema_enhancement' | 'internal_link_hub';
  title: string;
  targetQueryOrTopic: string;
  rationale: string;
  recommendedRoutePath: string;
  estimatedReach: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  competitorEvidence?: string[];
}

export interface OpportunityReport {
  schemaVersion: 'seo.gravity/v1';
  projectPath: string;
  totalOpportunitiesFound: number;
  opportunities: SEOpportunity[];
  summary: string;
}

export async function detectOpportunities(
  projectPath: string,
  focusKeywords: string[] = []
): Promise<OpportunityReport> {
  const resolved = path.resolve(projectPath);
  const adapter = getProjectAdapter(resolved);
  const routes = adapter.discoverRoutes(resolved);

  const opportunities: SEOpportunity[] = [];
  const routePaths = routes.map(r => r.routePath);

  // 1. Check for core programmatic SEO / comparison hubs
  const hasDocs = routePaths.some(p => p.includes('doc') || p.includes('guide'));
  const hasBlog = routePaths.some(p => p.includes('blog') || p.includes('post'));
  const hasFaq = routePaths.some(p => p.includes('faq'));

  if (!hasFaq) {
    opportunities.push({
      id: 'OPP-FAQ-001',
      category: 'content_expansion',
      title: 'Create Dedicated FAQ & Answer Hub',
      targetQueryOrTopic: 'Frequently Asked Questions & Product Specs',
      rationale: 'Sites with dedicated FAQ sections qualify for FAQPage rich snippets and capture high-intent long-tail search.',
      recommendedRoutePath: '/faq',
      estimatedReach: 'high',
      effort: 'low'
    });
  }

  if (!hasBlog && !hasDocs) {
    opportunities.push({
      id: 'OPP-CONTENT-001',
      category: 'content_expansion',
      title: 'Establish Top-of-Funnel Educational Hub (/blog or /docs)',
      targetQueryOrTopic: 'Industry Guides & Use-Case Articles',
      rationale: 'Adding educational subtopics increases domain topical authority and internal linking equity.',
      recommendedRoutePath: '/blog',
      estimatedReach: 'high',
      effort: 'medium'
    });
  }

  // 2. Keyword-driven route opportunities
  for (const kw of focusKeywords) {
    const slug = kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const isCovered = routePaths.some(r => r.includes(slug));
    if (!isCovered) {
      opportunities.push({
        id: `OPP-KW-${slug.slice(0, 10).toUpperCase()}`,
        category: 'content_expansion',
        title: `Create Target Landing Page for "${kw}"`,
        targetQueryOrTopic: kw,
        rationale: `Target keyword "${kw}" has search intent but lacks a matching dedicated route on the site.`,
        recommendedRoutePath: `/${slug}`,
        estimatedReach: 'medium',
        effort: 'low'
      });
    }
  }

  return {
    schemaVersion: 'seo.gravity/v1',
    projectPath: resolved,
    totalOpportunitiesFound: opportunities.length,
    opportunities,
    summary: `Identified ${opportunities.length} strategic expansion opportunities to improve topical authority and organic reach.`
  };
}
