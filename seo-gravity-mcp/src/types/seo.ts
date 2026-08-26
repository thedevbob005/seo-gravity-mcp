import { z } from 'zod';

// ==========================================
// 1. SERP & Competitor Intelligence Types
// ==========================================

export interface SerpResultItem {
  rank: number;
  title: string;
  url: string;
  snippet: string;
  displayedBreadcrumbs?: string;
  isFeaturedSnippet?: boolean;
}

export interface SerpAnalysisResponse {
  query: string;
  totalResultsFound?: string;
  organicResults: SerpResultItem[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  serpFeaturesDetected: string[];
}

export interface CompetitorPageProfile {
  url: string;
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  wordCount: number;
  readingTimeMinutes: number;
  readingGradeLevel: string;
  schemasFound: string[];
  canonical: string;
  robotsDirectives: string;
  openGraph: Record<string, string>;
  imageCount: number;
  imagesMissingAlt: number;
  internalLinksCount: number;
  externalLinksCount: number;
}

export interface ContentGapAnalysis {
  targetUrlOrKeyword: string;
  analyzedCompetitors: string[];
  averageCompetitorWordCount: number;
  targetWordCount: number;
  wordCountDelta: number;
  missingEntities: Array<{
    term: string;
    competitorFrequency: number;
    targetFrequency: number;
    importance: 'high' | 'medium' | 'low';
  }>;
  headingCoverageGaps: Array<{
    subtopic: string;
    coveredByCompetitorUrls: string[];
  }>;
  suggestedActionItems: string[];
}

export interface CompetitorDiffMatrix {
  myUrl: string;
  competitorUrl: string;
  focusKeyword: string;
  scorecard: Array<{
    metric: string;
    myValue: string | number;
    competitorValue: string | number;
    winner: 'my_site' | 'competitor' | 'tie';
    notes: string;
  }>;
  summary: {
    myScore: number;
    competitorScore: number;
    winner: 'my_site' | 'competitor' | 'tie';
    topPriorityFixes: string[];
  };
}

export interface ForumDiscussionsPulse {
  topic: string;
  rankingDiscussions: Array<{
    platform: 'Reddit' | 'Quora' | 'Other Forum';
    title: string;
    url: string;
    snippet: string;
  }>;
  extractedThemes: string[];
  frequentUserPainPoints: string[];
  consensusRecommendations: string[];
}

// ==========================================
// 2. GEO & AI Search Types
// ==========================================

export interface GeoAiReadinessReport {
  targetQuery: string;
  overallGeoScore: number; // 0 - 100
  citationLikelihood: 'High' | 'Medium' | 'Low';
  confidence?: 'High' | 'Medium' | 'Low';
  aiRetrievalSignals?: {
    directEntityDefinition: boolean;
    selfContainedAnswerBlocks: boolean;
    modularSemanticHeadings: boolean;
    factualDataAndStats: boolean;
    structuredListsOrTables: boolean;
  };
  evidenceTypeSummary?: {
    observed: string[];
    derived: string[];
    heuristic: string[];
    predictive: string[];
  };
  checks: {
    directAnswerParagraph: {
      passed: boolean;
      score: number;
      feedback: string;
      detectedSnippet?: string;
    };
    semanticChunking: {
      passed: boolean;
      score: number;
      feedback: string;
    };
    structuredDataAndLists: {
      passed: boolean;
      score: number;
      feedback: string;
    };
    authoritativeCitationsAndStats: {
      passed: boolean;
      score: number;
      feedback: string;
      detectedStatsCount: number;
    };
    entityClarity: {
      passed: boolean;
      score: number;
      feedback: string;
    };
  };
  recommendedSnippetsForAiCitation: Array<{
    section: string;
    suggestedFormat: string;
    exampleText: string;
  }>;
}

// ==========================================
// 3. E-E-A-T & Information Gain Types
// ==========================================

export interface InformationGainReport {
  targetKeyword: string;
  informationGainScore: number; // 0 - 100
  noveltyTier: 'Exceptional (High Information Gain)' | 'Moderate' | 'Low (Rehashed / Generic AI Risk)';
  uniqueEntitiesDetected: string[];
  competitorOverlapPercentage: number;
  originalElementsFound: {
    dataPointsAndStats: string[];
    caseStudiesOrExamples: string[];
    uniqueMethodologiesOrQuotes: string[];
  };
  recommendationsToIncreaseGain: string[];
}

export interface EeatAuditReport {
  overallEeatScore: number; // 0 - 100
  trustLevel: 'High Authority' | 'Moderate' | 'Needs Improvement';
  signals: {
    authorIdentity: {
      hasAuthorByline: boolean;
      hasAuthorBio: boolean;
      hasPersonSchema: boolean;
      sameAsProfilesLinked: string[];
    };
    transparency: {
      hasEditorialPolicy: boolean;
      hasFactCheckDisclaimer: boolean;
      hasPublishDate: boolean;
      hasModifiedDate: boolean;
    };
    contactAndEntity: {
      hasAboutPageLink: boolean;
      hasContactInfo: boolean;
      hasPhysicalAddress: boolean;
    };
    citationsAndReferences: {
      externalAuthoritativeCitationsCount: number;
      peerReviewedOrGovLinksCount: number;
    };
  };
  actionableImprovements: string[];
}

// ==========================================
// 4. On-Page & Technical Types
// ==========================================

export interface OnPageAuditReport {
  urlOrTitle: string;
  focusKeyword?: string;
  overallScore: number; // 0 - 100
  titleAudit: {
    text: string;
    characterCount: number;
    estimatedPixelWidth: number;
    status: 'optimal' | 'too_short' | 'too_long';
    containsKeyword: boolean;
    recommendation?: string;
  };
  metaDescriptionAudit: {
    text: string;
    characterCount: number;
    status: 'optimal' | 'too_short' | 'too_long' | 'missing';
    containsKeyword: boolean;
    hasCallToAction: boolean;
    recommendation?: string;
  };
  headingsAudit: {
    h1Count: number;
    h1Texts: string[];
    h2Count: number;
    h3Count: number;
    hierarchyValid: boolean;
    keywordInH1: boolean;
    keywordInH2: boolean;
    issues: string[];
  };
  contentBodyAudit: {
    wordCount: number;
    keywordOccurrences: number;
    keywordDensityPercent: number;
    keywordInFirst100Words: boolean;
    readabilityGrade: string;
  };
  imagesAudit: {
    totalImages: number;
    missingAltCount: number;
    imagesWithAltCount: number;
    suspiciouslyLargeImages: string[];
  };
  linksAudit: {
    internalLinksCount: number;
    externalLinksCount: number;
    genericAnchorTextsFound: string[];
  };
  urlSlugAudit: {
    slug: string;
    hasStopWords: boolean;
    containsKeyword: boolean;
    status: 'optimal' | 'warning';
  };
}

export interface ContentBrief {
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: 'Informational' | 'Transactional' | 'Commercial Investigation' | 'Navigational';
  recommendedWordCount: {
    min: number;
    target: number;
    max: number;
  };
  recommendedTitleFormulas: string[];
  recommendedMetaDescriptions: string[];
  headingOutline: Array<{
    level: 'H1' | 'H2' | 'H3';
    text: string;
    intentNotes: string;
    suggestedEntitiesToMention: string[];
  }>;
  requiredSemanticEntities: string[];
  peopleAlsoAskFaqSection: Array<{
    question: string;
    suggestedAnswerBullets: string[];
  }>;
}

export interface JsRenderingDiffReport {
  url: string;
  serverHtmlLength: number;
  hydratedDomLength: number;
  contentDifferencePercent: number;
  jsDependentElements: {
    linksOnlyInClientDom: string[];
    headingsOnlyInClientDom: string[];
    metaTagsRewrittenByClient: Array<{
      tag: string;
      serverValue: string;
      clientValue: string;
    }>;
  };
  seoCrawlerRisk: 'Low' | 'Medium' | 'High (Significant Hydration Dependence)';
  recommendations: string[];
}

export interface TechnicalAuditReport {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  redirectChain: string[];
  isHttps: boolean;
  canonicalTag: {
    present: boolean;
    value: string;
    isSelfReferencing: boolean;
  };
  robotsDirectives: {
    metaRobots: string;
    xRobotsTag: string;
    isNoIndex: boolean;
    isNoFollow: boolean;
  };
  hreflangTags: Array<{
    lang: string;
    href: string;
  }>;
  openGraphTags: {
    hasTitle: boolean;
    hasDescription: boolean;
    hasImage: boolean;
    hasType: boolean;
  };
  twitterCards: {
    hasCard: boolean;
    hasTitle: boolean;
    hasImage: boolean;
  };
  issuesFound: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    fix: string;
  }>;
}

// ==========================================
// 5. Schema & Knowledge Graph Types
// ==========================================

export interface EntitySalienceItem {
  name: string;
  salienceScore: number;
  type: string;
  wikidataId?: string;
  contextSentence?: string;
}

export interface SpoTriple {
  subject: string;
  predicate: string;
  object: string;
  sourceSentence: string;
}

export interface EntitySalienceMapReport {
  totalEntitiesFound: number;
  topEntities: EntitySalienceItem[];
  semanticTriples: SpoTriple[];
  knowledgeGraphSummary: string;
}

export interface SchemaValidationResult {
  schemasDetectedCount: number;
  schemas: Array<{
    type: string;
    rawObject: Record<string, any>;
    isValid: boolean;
    missingMandatoryFields: string[];
    recommendedImprovements: string[];
  }>;
  googleRichResultEligibility: Array<{
    feature: string;
    eligible: boolean;
    missingRequirements: string[];
  }>;
}

// ==========================================
// 6. Keywords, Performance & Maintenance
// ==========================================

export interface KeywordClusterGroup {
  clusterName: string;
  pillarTopic: string;
  primaryKeyword: string;
  supportingKeywords: string[];
  recommendedArticleType: string;
  recommendedUrlSlug: string;
}

export interface SearchIntentClassification {
  keyword: string;
  intent: 'Informational' | 'Transactional' | 'Commercial Investigation' | 'Navigational';
  confidenceScore: number;
  recommendedPageFormat: string;
}

export interface ContentDecayReport {
  urlOrTitle: string;
  freshnessScore: number; // 0 - 100
  decayLevel: 'Fresh' | 'Mild Decay' | 'Severe Decay';
  staleYearReferences: string[];
  detectedOutdatedStats: string[];
  brokenOutboundLinks: string[];
  suggestedUpdateChecklist: string[];
}

export interface PageSpeedAuditReport {
  url: string;
  strategy: string;
  performanceScore: number;
  coreWebVitals: {
    lcp: { value: string; status: 'Good' | 'Needs Improvement' | 'Poor' };
    fcp: { value: string; status: 'Good' | 'Needs Improvement' | 'Poor' };
    cls: { value: string; status: 'Good' | 'Needs Improvement' | 'Poor' };
    ttfb: { value: string; status: 'Good' | 'Needs Improvement' | 'Poor' };
  };
  topSpeedFixes: string[];
}

export * from './findings.js';


