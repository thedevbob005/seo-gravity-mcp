import { PolicyConfig, PolicyProfileName } from './types.js';

export const BUILTIN_PROFILES: Record<PolicyProfileName, PolicyConfig> = {
  // 1. Strict: Fails on any regression, including RECOMMENDED invariants
  strict: {
    version: 1,
    profile: 'strict',
    regression: {
      failOnLevels: ['REQUIRED', 'CONDITIONAL', 'RECOMMENDED'],
      failOnSeverities: ['critical', 'high', 'medium', 'low'],
      allowExpectedChanges: false,
      maxAllowedRegressions: 0
    },
    invariants: {
      'INV-HTTP-200': { requirementLevel: 'REQUIRED', severity: 'critical', enabled: true },
      'INV-CANONICAL-RESOLVES': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-TITLE-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LINK-ACCESSIBLE': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-ROBOTS-ALLOWED': { requirementLevel: 'REQUIRED', severity: 'medium', enabled: true },
      'INV-SITEMAP-PRESENT': { requirementLevel: 'REQUIRED', severity: 'medium', enabled: true },
      'INV-LLMS-TXT': { requirementLevel: 'RECOMMENDED', severity: 'medium', enabled: true }
    }
  },

  // 2. Balanced (Default): Fails on REQUIRED & CONDITIONAL regressions, treats RECOMMENDED as warnings
  balanced: {
    version: 1,
    profile: 'balanced',
    regression: {
      failOnLevels: ['REQUIRED', 'CONDITIONAL'],
      failOnSeverities: ['critical', 'high'],
      allowExpectedChanges: true,
      maxAllowedRegressions: 0
    },
    invariants: {
      'INV-HTTP-200': { requirementLevel: 'REQUIRED', severity: 'critical', enabled: true },
      'INV-CANONICAL-RESOLVES': { requirementLevel: 'CONDITIONAL', severity: 'high', enabled: true },
      'INV-TITLE-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LINK-ACCESSIBLE': { requirementLevel: 'CONDITIONAL', severity: 'medium', enabled: true },
      'INV-ROBOTS-ALLOWED': { requirementLevel: 'CONDITIONAL', severity: 'medium', enabled: true },
      'INV-SITEMAP-PRESENT': { requirementLevel: 'RECOMMENDED', severity: 'medium', enabled: true },
      'INV-LLMS-TXT': { requirementLevel: 'RECOMMENDED', severity: 'low', enabled: true }
    }
  },

  // 3. Startup: Fast-moving velocity, enforces core 200 & title, relaxed on sitemaps/llms.txt
  startup: {
    version: 1,
    profile: 'startup',
    regression: {
      failOnLevels: ['REQUIRED'],
      failOnSeverities: ['critical', 'high'],
      allowExpectedChanges: true,
      maxAllowedRegressions: 0
    },
    invariants: {
      'INV-HTTP-200': { requirementLevel: 'REQUIRED', severity: 'critical', enabled: true },
      'INV-CANONICAL-RESOLVES': { requirementLevel: 'CONDITIONAL', severity: 'medium', enabled: true },
      'INV-TITLE-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LINK-ACCESSIBLE': { requirementLevel: 'OPTIONAL', severity: 'low', enabled: true },
      'INV-ROBOTS-ALLOWED': { requirementLevel: 'OPTIONAL', severity: 'low', enabled: false },
      'INV-SITEMAP-PRESENT': { requirementLevel: 'OPTIONAL', severity: 'low', enabled: false },
      'INV-LLMS-TXT': { requirementLevel: 'OPTIONAL', severity: 'low', enabled: false }
    }
  },

  // 4. E-commerce: Strict on canonicals, internal link reachability, 404s, and metadata
  ecommerce: {
    version: 1,
    profile: 'ecommerce',
    regression: {
      failOnLevels: ['REQUIRED', 'CONDITIONAL'],
      failOnSeverities: ['critical', 'high', 'medium'],
      allowExpectedChanges: true,
      maxAllowedRegressions: 0
    },
    invariants: {
      'INV-HTTP-200': { requirementLevel: 'REQUIRED', severity: 'critical', enabled: true },
      'INV-CANONICAL-RESOLVES': { requirementLevel: 'REQUIRED', severity: 'critical', enabled: true },
      'INV-TITLE-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LINK-ACCESSIBLE': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-ROBOTS-ALLOWED': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-SITEMAP-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LLMS-TXT': { requirementLevel: 'RECOMMENDED', severity: 'low', enabled: true }
    }
  },

  // 5. Documentation: Strict on internal links, sitemaps, search indexability, and /llms.txt for AI agents
  documentation: {
    version: 1,
    profile: 'documentation',
    regression: {
      failOnLevels: ['REQUIRED', 'CONDITIONAL', 'RECOMMENDED'],
      failOnSeverities: ['critical', 'high', 'medium'],
      allowExpectedChanges: true,
      maxAllowedRegressions: 0
    },
    invariants: {
      'INV-HTTP-200': { requirementLevel: 'REQUIRED', severity: 'critical', enabled: true },
      'INV-CANONICAL-RESOLVES': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-TITLE-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LINK-ACCESSIBLE': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-ROBOTS-ALLOWED': { requirementLevel: 'CONDITIONAL', severity: 'medium', enabled: true },
      'INV-SITEMAP-PRESENT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true },
      'INV-LLMS-TXT': { requirementLevel: 'REQUIRED', severity: 'high', enabled: true }
    }
  }
};
