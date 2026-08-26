export type FindingCategory =
  | 'technical'
  | 'content'
  | 'discoverability'
  | 'authority'
  | 'entity'
  | 'performance'
  | 'ai_readiness';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EvidenceType = 'observed' | 'derived' | 'heuristic' | 'predictive';

export type ReliabilityState =
  | 'PASS'
  | 'FAIL'
  | 'WARNING'
  | 'UNKNOWN'
  | 'NOT_APPLICABLE';

export type EffortLevel = 'trivial' | 'low' | 'medium' | 'high';

export type PriorityTier = 'critical' | 'high' | 'medium' | 'low';

export interface SourceLocation {
  filePath: string;
  line?: number;
  column?: number;
  exportName?: string;
  componentName?: string;
  snippet?: string;
}

export interface SuggestedFix {
  type: 'code_snippet' | 'file_creation' | 'config_update' | 'meta_tag_update' | 'manual_action';
  filePath?: string;
  explanation: string;
  snippet?: string;
  diffPreview?: string;
}

export interface Finding {
  id: string; // e.g. "SEO-CANONICAL-001"
  category: FindingCategory;
  title: string;
  severity: SeverityLevel;
  confidence: number; // 0.0 to 1.0
  evidenceType: EvidenceType;
  evidence: string;
  affectedUrl: string;
  sourceLocation?: SourceLocation;
  likelyRootCause?: string;
  recommendation: string;
  suggestedFix?: SuggestedFix;
  expectedImpact: string;
  effort: EffortLevel;
  priorityScore: number; // Computed: (Impact * Confidence * Reach) / Effort
  priorityTier: PriorityTier;
  reliabilityState: ReliabilityState;
  verification: {
    method: string;
    expectedOutcome: string;
  };
}

export interface ScoreDimension {
  score: number; // 0 - 100
  weight: number;
  confidence: 'High' | 'Medium' | 'Low';
  evidenceCount: number;
  state: ReliabilityState;
  keyIssuesCount: number;
}

export interface MultiDimensionalScores {
  technical: ScoreDimension;
  content: ScoreDimension;
  discoverability: ScoreDimension;
  authority: ScoreDimension;
  entity: ScoreDimension;
  performance: ScoreDimension;
  aiReadiness: ScoreDimension;
  overallHealth: number; // 0 - 100
  overallConfidence: 'High' | 'Medium' | 'Low';
  totalEvidenceSignals: number;
}

export type SupportedFramework =
  | 'nextjs-app-router'
  | 'nextjs-pages-router'
  | 'astro'
  | 'remix'
  | 'vite-react'
  | 'sveltekit'
  | 'nuxt'
  | 'static-html'
  | 'unknown';

export interface ProjectFrameworkInfo {
  framework: SupportedFramework;
  name: string;
  version?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  hasTypeScript: boolean;
  hasSitemapConfig: boolean;
  hasRobotsConfig: boolean;
  hasLlmsTxt: boolean;
  rootDir: string;
  routesDir?: string;
  devCommand?: string;
  defaultDevPort?: number;
}

export interface DiscoveredRoute {
  routePath: string; // e.g. "/blog/:slug" or "/about"
  sourceFilePath: string; // relative to project root
  isDynamic: boolean;
  dynamicParams: string[];
  routeType: 'page' | 'api' | 'layout' | 'sitemap' | 'robots' | 'static';
  hasMetadataExport: boolean;
  hasGenerateMetadata: boolean;
  hasSchemaMarkup: boolean;
  hasHeadComponent: boolean;
  isClientComponent: boolean;
}

export interface RouteSourceMapping {
  urlPath: string;
  matchedRoute?: DiscoveredRoute;
  sourceFilePath?: string;
  confidence: number; // 0.0 to 1.0
  resolutionMethod: 'exact_match' | 'pattern_match' | 'fallback_heuristic' | 'unmapped';
}

export interface CrawlGraphNode {
  url: string;
  routePath?: string;
  title: string;
  statusCode: number;
  clickDepth: number;
  incomingLinksCount: number;
  outgoingLinksCount: number;
  pageRankScore: number; // Normalized 0.0 - 1.0
  isOrphan: boolean;
  isDeadEnd: boolean;
  isHubPage: boolean;
}

export interface CrawlGraphEdge {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  isNofollow: boolean;
  isGenericAnchor: boolean;
}

export interface CrawlGraphSummary {
  totalNodes: number;
  totalEdges: number;
  maxClickDepth: number;
  orphanPages: string[];
  hubPages: string[];
  deadEnds: string[];
  circularLoops: Array<{ cycle: string[] }>;
  nodes: CrawlGraphNode[];
  edges: CrawlGraphEdge[];
}

export interface ProjectSnapshot {
  schemaVersion: 'seo.gravity/v1';
  snapshotId: string;
  createdAt: string;
  projectPath: string;
  frameworkInfo: ProjectFrameworkInfo;
  discoveredRoutes: DiscoveredRoute[];
  scores: MultiDimensionalScores;
  findings: Finding[];
  crawlGraph?: CrawlGraphSummary;
  routeMappings: RouteSourceMapping[];
}

export interface RegressionReport {
  schemaVersion: 'seo.gravity/v1';
  baselineSnapshotId: string;
  currentSnapshotId: string;
  evaluatedAt: string;
  status: 'NO_REGRESSION' | 'REGRESSION_DETECTED' | 'IMPROVEMENTS_ONLY' | 'MIXED_CHANGES';
  overallScoreDelta: number;
  scoreDeltas: Record<
    keyof Omit<MultiDimensionalScores, 'overallHealth' | 'overallConfidence' | 'totalEvidenceSignals'>,
    {
      before: number;
      after: number;
      delta: number;
      state: 'improved' | 'regressed' | 'unchanged';
    }
  >;
  resolvedFindings: Finding[];
  newRegressions: Finding[];
  unresolvedFindings: Finding[];
  totalResolvedCount: number;
  totalNewRegressionsCount: number;
  alerts: string[];
}

export interface ProjectAuditResult {
  schemaVersion: 'seo.gravity/v1';
  projectPath: string;
  scannedAt: string;
  framework: ProjectFrameworkInfo;
  routesSummary: {
    totalDiscovered: number;
    dynamicRoutesCount: number;
    routesMissingMetadata: number;
    routesMissingSchema: number;
  };
  scores: MultiDimensionalScores;
  topPriorityFindings: Finding[];
  totalFindingsCount: number;
  findingsByCategory: Record<FindingCategory, number>;
  crawlGraphSummary?: {
    totalPagesCrawled: number;
    orphanPagesDetected: string[];
    hubPagesDetected: string[];
    deepPagesOver3Clicks: string[];
  };
  recommendedImmediateAction: string;
}

export interface DiagnosticResult {
  schemaVersion: 'seo.gravity/v1';
  targetUrlOrFile: string;
  matchedRoute?: DiscoveredRoute;
  sourceLocation?: SourceLocation;
  detectedIssues: Finding[];
  likelyRootCauses: Array<{
    issueId: string;
    description: string;
    sourceCodeSnippet?: string;
    whyItOccurs: string;
  }>;
  suggestedFixBlueprints: Array<{
    issueId: string;
    title: string;
    targetFile: string;
    actionType: 'modify_file' | 'create_file' | 'config_update';
    codeToInsertOrReplace: string;
    verificationInstructions: string;
  }>;
}

export interface PrioritizedSprint {
  schemaVersion: 'seo.gravity/v1';
  generatedAt: string;
  totalFindings: number;
  sprints: {
    quickWins: Finding[]; // Low Effort, High Impact
    criticalBlockers: Finding[]; // Critical Severity, High Reach
    architecturalImprovements: Finding[]; // Medium/High Effort, High Value
    minorPolish: Finding[]; // Low Severity / Low Reach
  };
  estimatedTotalEffortHours: number;
  projectedScoreImprovement: {
    currentScore: number;
    projectedScoreAfterQuickWins: number;
    projectedScoreAfterAll: number;
  };
}
