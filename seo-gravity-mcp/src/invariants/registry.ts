import {
  InvariantDefinition,
  InvariantEvaluationContext,
  InvariantEvaluationResult
} from './types.js';
import { SEOInvariant, Provenance } from '../types/canonical.js';

export const BUILTIN_INVARIANTS: InvariantDefinition[] = [
  {
    id: 'INV-HTTP-200',
    name: 'HTTP 200 Success Status',
    description: 'Published routes must return HTTP 200 OK without 4xx client or 5xx server errors.',
    category: 'http',
    requirementLevel: 'REQUIRED',
    severity: 'critical',
    scope: 'PAGE',
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
        evidence: ok ? 'Page returned healthy status code.' : `Page returned error status code: ${code}`,
        polymorphicEvidence: {
          type: 'header',
          description: `HTTP response status ${code}`,
          statusCode: code,
          timestamp: new Date().toISOString()
        }
      };
    }
  },
  {
    id: 'INV-CANONICAL-RESOLVES',
    name: 'Canonical URL Declaration',
    description: 'Indexable pages must explicitly declare a canonical master URL to prevent duplicate content indexation.',
    category: 'canonical',
    requirementLevel: 'CONDITIONAL',
    severity: 'high',
    scope: 'PAGE',
    expectedCondition: 'Canonical tag (alternates.canonical or <link rel="canonical">) is declared for indexable pages',
    failureEvidence: 'Canonical URL declaration is missing from page component/metadata.',
    remediationGuide: 'Add alternates.canonical to export const metadata or insert <link rel="canonical"> in head.',
    verificationMethod: 'Inspect rendered HTML <head> or AST component for valid canonical declaration.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const has = Boolean(ctx.hasCanonical || ctx.extractedCanonical);
      return {
        satisfied: has,
        observedCondition: has ? `Canonical declared (${ctx.extractedCanonical || 'present'})` : 'Canonical missing',
        evidence: has ? 'Canonical tag present.' : 'No canonical tag found.',
        polymorphicEvidence: ctx.sourceFilePath ? {
          type: 'ast',
          description: has ? 'Canonical declaration found in AST' : 'Canonical missing from source AST',
          sourceFile: ctx.sourceFilePath,
          startLine: ctx.sourceRange?.startLine,
          endLine: ctx.sourceRange?.endLine,
          timestamp: new Date().toISOString()
        } : undefined
      };
    }
  },
  {
    id: 'INV-TITLE-PRESENT',
    name: 'Search Snippet Title Metadata',
    description: 'Pages must declare a descriptive, unique title for search engine result snippets.',
    category: 'metadata',
    requirementLevel: 'REQUIRED',
    severity: 'high',
    scope: 'PAGE',
    expectedCondition: 'Title is declared in component metadata, template block, or <title> tag',
    failureEvidence: 'Title tag or title export is missing.',
    remediationGuide: 'Export title in page metadata, define @section/block title, or add <title> in component head.',
    verificationMethod: 'Inspect page <title> in AST, template, or rendered DOM.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const has = ctx.hasTitle !== undefined ? ctx.hasTitle : Boolean(ctx.extractedTitle || ctx.hasMetadata);
      return {
        satisfied: has,
        observedCondition: has ? `Title present ("${ctx.extractedTitle || 'Declared'}")` : 'Title missing',
        evidence: has ? 'Title metadata defined.' : 'No title metadata found.',
        polymorphicEvidence: ctx.sourceFilePath ? {
          type: 'ast',
          description: has ? `Title metadata: "${ctx.extractedTitle || 'Declared'}"` : 'Title metadata missing',
          sourceFile: ctx.sourceFilePath,
          startLine: ctx.sourceRange?.startLine,
          endLine: ctx.sourceRange?.endLine,
          timestamp: new Date().toISOString()
        } : undefined
      };
    }
  },
  {
    id: 'INV-LINK-ACCESSIBLE',
    name: 'Internal Link Reachability',
    description: 'Published public pages must be accessible via internal links and must not be orphans.',
    category: 'links',
    requirementLevel: 'CONDITIONAL',
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
        evidence: ok ? 'Page is connected to internal crawl graph.' : 'Page is an orphan with 0 incoming links.',
        polymorphicEvidence: {
          type: 'dom',
          description: `Internal inlinks count: ${count}`,
          htmlSnippet: `<a href="${ctx.url}">...</a>`,
          timestamp: new Date().toISOString()
        }
      };
    }
  },
  {
    id: 'INV-ROBOTS-ALLOWED',
    name: 'Robots Policy Determinable',
    description: 'Project must provide a determinable robots crawl policy via robots.txt, robots.ts, or standard allow-all defaults.',
    category: 'robots',
    requirementLevel: 'CONDITIONAL',
    severity: 'medium',
    scope: 'SITE',
    expectedCondition: 'Robots crawl policy is determinable and does not block critical assets',
    failureEvidence: 'No robots crawl configuration detected.',
    remediationGuide: 'Create public/robots.txt or app/robots.ts if specific bot directives are desired.',
    verificationMethod: 'Check GET /robots.txt response or adapter robots inspection.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const ok = Boolean(ctx.hasRobots);
      return {
        satisfied: ok,
        observedCondition: ok ? 'Robots policy determinable' : 'Robots policy not explicitly declared',
        evidence: ok ? 'robots.txt configuration present.' : 'No robots.txt found (default allow-all).',
        polymorphicEvidence: {
          type: 'route_config',
          description: ok ? 'Robots config resolved' : 'Robots config absent',
          sourceFile: 'robots.txt',
          configFormat: 'static_file',
          declaredPattern: '/robots.txt',
          timestamp: new Date().toISOString()
        }
      };
    }
  },
  {
    id: 'INV-SITEMAP-PRESENT',
    name: 'XML Sitemap Configuration',
    description: 'Project should publish or generate an XML sitemap to ensure efficient crawler route discovery.',
    category: 'robots',
    requirementLevel: 'RECOMMENDED',
    severity: 'medium',
    scope: 'SITE',
    expectedCondition: 'sitemap.xml or dynamic sitemap route exists',
    failureEvidence: 'No sitemap configuration file detected.',
    remediationGuide: 'Create public/sitemap.xml, app/sitemap.ts, or dynamic sitemap route.',
    verificationMethod: 'Check GET /sitemap.xml response or adapter discovery.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const ok = Boolean(ctx.hasSitemap);
      return {
        satisfied: ok,
        observedCondition: ok ? 'Sitemap configuration detected' : 'Sitemap configuration absent',
        evidence: ok ? 'sitemap.xml configuration present.' : 'No sitemap.xml found.',
        polymorphicEvidence: {
          type: 'route_config',
          description: ok ? 'Sitemap config resolved' : 'Sitemap config absent',
          sourceFile: 'sitemap.xml',
          configFormat: 'static_file',
          declaredPattern: '/sitemap.xml',
          timestamp: new Date().toISOString()
        }
      };
    }
  },
  {
    id: 'INV-LLMS-TXT',
    name: 'AI Agent Context File (/llms.txt)',
    description: 'Project should provide /llms.txt for AI search engine documentation and knowledge synthesis.',
    category: 'ai_readiness',
    requirementLevel: 'RECOMMENDED',
    severity: 'low',
    scope: 'SITE',
    expectedCondition: 'public/llms.txt or /llms.txt context file exists',
    failureEvidence: 'No /llms.txt found.',
    remediationGuide: 'Generate /llms.txt with key documentation and landing page summaries.',
    verificationMethod: 'Check GET /llms.txt response.',
    evaluate(ctx: InvariantEvaluationContext): InvariantEvaluationResult {
      const ok = Boolean(ctx.hasLlmsTxt);
      return {
        satisfied: ok,
        observedCondition: ok ? '/llms.txt present' : '/llms.txt absent',
        evidence: ok ? '/llms.txt file detected.' : 'No /llms.txt found (recommended for GEO/AEO).',
        polymorphicEvidence: {
          type: 'route_config',
          description: ok ? '/llms.txt resolved' : '/llms.txt absent',
          sourceFile: 'llms.txt',
          configFormat: 'static_file',
          declaredPattern: '/llms.txt',
          timestamp: new Date().toISOString()
        }
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
      requirementLevel: def.requirementLevel,
      severity: def.severity,
      provenance,
      evidence: res.polymorphicEvidence
    };
  }
}

export const defaultInvariantRegistry = new InvariantRegistry();
