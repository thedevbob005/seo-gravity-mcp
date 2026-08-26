import {
  InvariantDefinition,
  InvariantEvaluationContext,
  InvariantEvaluationResult
} from './types.js';
import { SEOInvariant, Provenance } from '../types/findings.js';

export const BUILTIN_INVARIANTS: InvariantDefinition[] = [
  {
    id: 'INV-HTTP-200',
    name: 'HTTP 200 Success Status',
    description: 'Published routes must return HTTP 200 OK without 4xx client or 5xx server errors.',
    category: 'http',
    severity: 'critical',
    scope: 'page',
    expectedCondition: 'HTTP status code is 200 or intentional 3xx redirect',
    failureEvidence: 'HTTP status returned 4xx or 5xx error.',
    remediationGuide: 'Check route routing logic, fix broken redirect rules, or restore missing page handler.',
    verificationMethod: 'Curl the URL and verify 200 OK header response.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const code = ctx.statusCode ?? 200;
      const ok = code >= 200 && code < 400;
      return {
        satisfied: ok,
        observedCondition: `HTTP status code: ${code}`,
        evidence: ok ? 'Page returned healthy status code.' : `Page returned error status code: ${code}`
      };
    }
  },
  {
    id: 'INV-CANONICAL-RESOLVES',
    name: 'Canonical URL Declaration',
    description: 'Indexable pages must explicitly declare a canonical master URL to prevent duplicate content indexation.',
    category: 'canonical',
    severity: 'high',
    scope: 'page',
    expectedCondition: 'Canonical tag (alternates.canonical or <link rel="canonical">) is declared',
    failureEvidence: 'Canonical URL declaration is missing from page component/metadata.',
    remediationGuide: 'Add alternates.canonical to export const metadata or insert <link rel="canonical"> in head.',
    verificationMethod: 'Inspect rendered HTML <head> for valid <link rel="canonical">.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const has = Boolean(ctx.hasCanonical || ctx.extractedCanonical);
      return {
        satisfied: has,
        observedCondition: has ? `Canonical declared (${ctx.extractedCanonical || 'present'})` : 'Canonical missing',
        evidence: has ? 'Canonical tag present.' : 'No canonical tag found.'
      };
    }
  },
  {
    id: 'INV-TITLE-PRESENT',
    name: 'Search Snippet Title Metadata',
    description: 'Pages must declare a descriptive, unique title for search engine result snippets.',
    category: 'metadata',
    severity: 'high',
    scope: 'page',
    expectedCondition: 'Title is declared in component metadata or <title> tag',
    failureEvidence: 'Title tag or title export is missing.',
    remediationGuide: 'Export title in page metadata or add <title> in component head.',
    verificationMethod: 'Inspect page <title> in rendered DOM.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const has = Boolean(ctx.hasMetadata || ctx.extractedTitle);
      return {
        satisfied: has,
        observedCondition: has ? `Title present ("${ctx.extractedTitle || 'Declared'}")` : 'Title missing',
        evidence: has ? 'Title metadata defined.' : 'No title metadata found.'
      };
    }
  },
  {
    id: 'INV-LINK-ACCESSIBLE',
    name: 'Internal Link Reachability',
    description: 'Published public pages must be accessible via internal links and must not be orphans.',
    category: 'links',
    severity: 'medium',
    scope: 'crawl_graph',
    expectedCondition: 'Incoming internal link count >= 1',
    failureEvidence: 'Page has 0 incoming internal links from other crawlable routes.',
    remediationGuide: 'Add navigation link or contextual internal links pointing to this route.',
    verificationMethod: 'Run crawl graph analysis and verify incomingLinksCount > 0.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const count = ctx.incomingLinksCount ?? 1;
      const ok = count > 0;
      return {
        satisfied: ok,
        observedCondition: `Incoming link count: ${count}`,
        evidence: ok ? 'Page is connected to internal crawl graph.' : 'Page is an orphan with 0 incoming links.'
      };
    }
  },
  {
    id: 'INV-ROBOTS-ALLOWED',
    name: 'Robots Configuration Present',
    description: 'Project must provide robots.txt or robots.ts specifying crawl directives for search engines.',
    category: 'robots',
    severity: 'high',
    scope: 'site_wide',
    expectedCondition: 'robots.txt or robots.ts configuration file exists',
    failureEvidence: 'No robots.txt or robots.ts configuration file detected.',
    remediationGuide: 'Create public/robots.txt or app/robots.ts.',
    verificationMethod: 'Check GET /robots.txt response.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const ok = Boolean(ctx.hasRobots);
      return {
        satisfied: ok,
        observedCondition: ok ? 'Robots configuration detected' : 'Robots configuration missing',
        evidence: ok ? 'robots.txt configuration present.' : 'No robots.txt found.'
      };
    }
  },
  {
    id: 'INV-SITEMAP-PRESENT',
    name: 'XML Sitemap Configuration Present',
    description: 'Project must generate or publish an XML sitemap to ensure full discovery of published routes.',
    category: 'robots',
    severity: 'high',
    scope: 'site_wide',
    expectedCondition: 'sitemap.xml or sitemap.ts configuration exists',
    failureEvidence: 'No sitemap configuration file detected.',
    remediationGuide: 'Create public/sitemap.xml or app/sitemap.ts.',
    verificationMethod: 'Check GET /sitemap.xml response.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const ok = Boolean(ctx.hasSitemap);
      return {
        satisfied: ok,
        observedCondition: ok ? 'Sitemap configuration detected' : 'Sitemap configuration missing',
        evidence: ok ? 'sitemap.xml configuration present.' : 'No sitemap.xml found.'
      };
    }
  },
  {
    id: 'INV-LLMS-TXT',
    name: 'AI Agent Context File (/llms.txt)',
    description: 'Site should provide /llms.txt for AI search engine documentation and knowledge synthesis.',
    category: 'ai_readiness',
    severity: 'medium',
    scope: 'site_wide',
    expectedCondition: 'public/llms.txt exists',
    failureEvidence: 'No /llms.txt found.',
    remediationGuide: 'Generate /llms.txt using seo_llms_txt_generate.',
    verificationMethod: 'Check GET /llms.txt response.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const ok = Boolean(ctx.hasLlmsTxt);
      return {
        satisfied: ok,
        observedCondition: ok ? '/llms.txt present' : '/llms.txt missing',
        evidence: ok ? '/llms.txt file detected.' : 'No /llms.txt found.'
      };
    }
  }
];

export class InvariantRegistry {
  private invariants = new Map<string, InvariantDefinition>();

  constructor(initial: InvariantDefinition[] = BUILTIN_INVARIANTS) {
    for (const inv of initial) {
      this.invariants.set(inv.id, inv);
    }
  }

  public register(invariant: InvariantDefinition): void {
    this.invariants.set(invariant.id, invariant);
  }

  public get(id: string): InvariantDefinition | undefined {
    return this.invariants.get(id);
  }

  public getAll(): InvariantDefinition[] {
    return Array.from(this.invariants.values());
  }

  public evaluateContext(
    invariantId: string,
    context: InvariantEvaluationContext,
    provenance: Provenance
  ): SEOInvariant | null {
    const def = this.invariants.get(invariantId);
    if (!def) return null;

    const res = def.evaluate(context);
    return {
      id: def.id as any,
      logicalPageId: context.logicalPageId,
      url: context.url,
      description: def.description,
      expectedCondition: def.expectedCondition,
      observedCondition: res.observedCondition,
      satisfied: res.satisfied,
      provenance
    };
  }
}

export const defaultInvariantRegistry = new InvariantRegistry();
