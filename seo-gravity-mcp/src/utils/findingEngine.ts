import {
  Finding,
  FindingCategory,
  SeverityLevel,
  EvidenceType,
  EffortLevel,
  PriorityTier,
  ReliabilityState,
  SourceLocation,
  SuggestedFix,
  MultiDimensionalScores,
  ScoreDimension,
  SupportedFramework
} from '../types/findings.js';

export interface CreateFindingParams {
  id: string;
  category: FindingCategory;
  title: string;
  severity: SeverityLevel;
  confidence?: number;
  evidenceType: EvidenceType;
  evidence: string;
  affectedUrl: string;
  sourceLocation?: SourceLocation;
  likelyRootCause?: string;
  recommendation: string;
  suggestedFix?: SuggestedFix;
  expectedImpact: string;
  effort: EffortLevel;
  reach?: 'site_wide' | 'multi_page' | 'single_page' | 'isolated';
  reliabilityState?: ReliabilityState;
  verification?: {
    method: string;
    expectedOutcome: string;
  };
}

const SEVERITY_IMPACT_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 10,
  high: 7.5,
  medium: 5,
  low: 2.5,
  info: 1
};

const EFFORT_WEIGHTS: Record<EffortLevel, number> = {
  trivial: 1,
  low: 2,
  medium: 4,
  high: 8
};

const REACH_WEIGHTS = {
  site_wide: 10,
  multi_page: 7,
  single_page: 3.5,
  isolated: 1.5
};

export function calculatePriorityScore(
  severity: SeverityLevel,
  confidence = 0.9,
  effort: EffortLevel = 'medium',
  reach: 'site_wide' | 'multi_page' | 'single_page' | 'isolated' = 'single_page'
): { priorityScore: number; priorityTier: PriorityTier } {
  const impact = SEVERITY_IMPACT_WEIGHTS[severity] || 5;
  const reachVal = REACH_WEIGHTS[reach] || 3.5;
  const effortVal = EFFORT_WEIGHTS[effort] || 4;
  const conf = Math.max(0.1, Math.min(1.0, confidence));

  // Priority formula: (Impact * Confidence * Reach) / Effort
  const rawScore = (impact * conf * reachVal) / effortVal;
  const priorityScore = Math.round(rawScore * 10) / 10;

  let priorityTier: PriorityTier = 'low';
  if (priorityScore >= 18) {
    priorityTier = 'critical';
  } else if (priorityScore >= 9) {
    priorityTier = 'high';
  } else if (priorityScore >= 4) {
    priorityTier = 'medium';
  }

  return { priorityScore, priorityTier };
}

export function createFinding(params: CreateFindingParams): Finding {
  const confidence = params.confidence ?? 0.9;
  const reach = params.reach ?? 'single_page';
  const { priorityScore, priorityTier } = calculatePriorityScore(
    params.severity,
    confidence,
    params.effort,
    reach
  );

  const reliabilityState: ReliabilityState =
    params.reliabilityState ||
    (params.severity === 'critical' || params.severity === 'high'
      ? 'FAIL'
      : params.severity === 'medium'
      ? 'WARNING'
      : 'PASS');

  const defaultVerification = {
    method: `Re-audit '${params.affectedUrl}' and inspect ${params.category} signals.`,
    expectedOutcome: `Issue '${params.id}' is resolved with no regression.`
  };

  return {
    id: params.id,
    category: params.category,
    title: params.title,
    severity: params.severity,
    confidence,
    evidenceType: params.evidenceType,
    evidence: params.evidence,
    affectedUrl: params.affectedUrl,
    sourceLocation: params.sourceLocation,
    likelyRootCause: params.likelyRootCause,
    recommendation: params.recommendation,
    suggestedFix: params.suggestedFix,
    expectedImpact: params.expectedImpact,
    effort: params.effort,
    priorityScore,
    priorityTier,
    reliabilityState,
    verification: params.verification || defaultVerification
  };
}

export function calculateMultiDimensionalScores(
  findings: Finding[],
  extraSignals?: {
    pagespeedScore?: number;
    discoveredRoutesCount?: number;
    hasSitemap?: boolean;
    hasRobots?: boolean;
    hasLlmsTxt?: boolean;
  }
): MultiDimensionalScores {
  const categoryDeductions: Record<FindingCategory, number> = {
    technical: 0,
    content: 0,
    discoverability: 0,
    authority: 0,
    entity: 0,
    performance: 0,
    ai_readiness: 0
  };

  const categoryFindingCounts: Record<FindingCategory, number> = {
    technical: 0,
    content: 0,
    discoverability: 0,
    authority: 0,
    entity: 0,
    performance: 0,
    ai_readiness: 0
  };

  for (const f of findings) {
    categoryFindingCounts[f.category]++;
    let deduction = 0;
    switch (f.severity) {
      case 'critical':
        deduction = 25;
        break;
      case 'high':
        deduction = 15;
        break;
      case 'medium':
        deduction = 8;
        break;
      case 'low':
        deduction = 3;
        break;
      case 'info':
        deduction = 0;
        break;
    }
    categoryDeductions[f.category] += deduction * f.confidence;
  }

  // Bonus / deductions for discoverability assets
  if (extraSignals?.hasSitemap === false) categoryDeductions.discoverability += 20;
  if (extraSignals?.hasRobots === false) categoryDeductions.discoverability += 15;
  if (extraSignals?.hasLlmsTxt === false) categoryDeductions.ai_readiness += 10;

  const buildDimension = (
    category: FindingCategory,
    weight: number,
    baseScore = 100
  ): ScoreDimension => {
    const raw = Math.max(0, Math.min(100, baseScore - categoryDeductions[category]));
    const count = categoryFindingCounts[category];
    const state: ReliabilityState =
      raw >= 80 ? 'PASS' : raw >= 50 ? 'WARNING' : 'FAIL';
    const confidence = count >= 3 ? 'High' : count >= 1 ? 'Medium' : 'High';

    return {
      score: Math.round(raw),
      weight,
      confidence,
      evidenceCount: count,
      state,
      keyIssuesCount: count
    };
  };

  const perfScore =
    extraSignals?.pagespeedScore !== undefined
      ? Math.max(0, Math.min(100, extraSignals.pagespeedScore - categoryDeductions.performance))
      : 100;

  const technical = buildDimension('technical', 0.22);
  const content = buildDimension('content', 0.2);
  const discoverability = buildDimension('discoverability', 0.15);
  const authority = buildDimension('authority', 0.1);
  const entity = buildDimension('entity', 0.12);
  const performance = buildDimension('performance', 0.11, perfScore);
  const aiReadiness = buildDimension('ai_readiness', 0.1);

  // Overall Health weighted score
  const overall =
    technical.score * technical.weight +
    content.score * content.weight +
    discoverability.score * discoverability.weight +
    authority.score * authority.weight +
    entity.score * entity.weight +
    performance.score * performance.weight +
    aiReadiness.score * aiReadiness.weight;

  const totalSignals = findings.length + (extraSignals ? 4 : 0);
  const overallConfidence =
    totalSignals >= 8 ? 'High' : totalSignals >= 3 ? 'Medium' : 'Low';

  return {
    technical,
    content,
    discoverability,
    authority,
    entity,
    performance,
    aiReadiness,
    overallHealth: Math.round(overall),
    overallConfidence,
    totalEvidenceSignals: totalSignals
  };
}

export function generateCodeFixSnippet(
  issueId: string,
  framework: SupportedFramework,
  context: {
    pageTitle?: string;
    canonicalUrl?: string;
    metaDescription?: string;
    schemaType?: string;
    filePath?: string;
  }
): SuggestedFix {
  switch (issueId) {
    case 'SEO-CANONICAL-001': {
      if (framework === 'nextjs-app-router') {
        return {
          type: 'code_snippet',
          explanation: 'Add alternates.canonical to your Next.js generateMetadata() or metadata export.',
          snippet: `export const metadata: Metadata = {
  title: "${context.pageTitle || 'Page Title'}",
  description: "${context.metaDescription || 'Page Description'}",
  alternates: {
    canonical: "${context.canonicalUrl || 'https://yourdomain.com/canonical-path'}",
  },
};`
        };
      }
      if (framework === 'astro') {
        return {
          type: 'code_snippet',
          explanation: 'Add link rel="canonical" in your Astro layout or page head.',
          snippet: `<link rel="canonical" href="${context.canonicalUrl || 'https://yourdomain.com/canonical-path'}" />`
        };
      }
      return {
        type: 'code_snippet',
        explanation: 'Add canonical tag inside <head>.',
        snippet: `<link rel="canonical" href="${context.canonicalUrl || 'https://yourdomain.com/path'}" />`
      };
    }

    case 'SEO-TITLE-001': {
      if (framework === 'nextjs-app-router') {
        return {
          type: 'code_snippet',
          explanation: 'Export metadata object in Next.js page.tsx.',
          snippet: `export const metadata: Metadata = {
  title: "${context.pageTitle || 'Descriptive Keyword-Rich Title | Brand'}",
  description: "${context.metaDescription || 'Compelling search description under 155 characters.'}",
};`
        };
      }
      return {
        type: 'code_snippet',
        explanation: 'Add <title> tag inside <head>.',
        snippet: `<title>${context.pageTitle || 'Descriptive Keyword-Rich Title | Brand'}</title>`
      };
    }

    case 'SEO-SCHEMA-001': {
      return {
        type: 'code_snippet',
        explanation: 'Inject structured data JSON-LD script.',
        snippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${context.schemaType || 'Article'}",
  "headline": "${context.pageTitle || 'Article Headline'}",
  "description": "${context.metaDescription || 'Article summary'}"
}
</script>`
      };
    }

    case 'SEO-ROBOTS-001': {
      return {
        type: 'file_creation',
        filePath: 'public/robots.txt',
        explanation: 'Create standard robots.txt permitting search engines & AI crawlers.',
        snippet: `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml`
      };
    }

    case 'SEO-LLMS-001': {
      return {
        type: 'file_creation',
        filePath: 'public/llms.txt',
        explanation: 'Create /llms.txt to provide structured context for generative AI search engines.',
        snippet: `# Project Overview
> Clean, structured context for AI agents & search models.

## Key Pages
- [Home](https://yourdomain.com/): Core website landing page
- [Documentation](https://yourdomain.com/docs): Full product guides & API reference`
      };
    }

    default:
      return {
        type: 'manual_action',
        explanation: `Review ${context.filePath || 'source file'} and resolve issue '${issueId}'.`
      };
  }
}
