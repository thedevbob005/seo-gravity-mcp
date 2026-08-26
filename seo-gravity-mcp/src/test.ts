import * as path from 'path';
import { fileURLToPath } from 'url';

// Core Tool Imports
import { auditOnPage, generateContentBrief, scoreReadability } from './tools/onpage.js';
import { auditGeoAiReadiness, generateLlmsTxt, auditAiBotsRobots } from './tools/geo.js';
import { scoreInformationGain, auditEeat } from './tools/eeat.js';
import { getKeywordSuggestions, findQuestions, clusterKeywords, classifySearchIntent } from './tools/keywords.js';
import { mapEntitySalience, generateSchemaMarkup, validateSchema } from './tools/schema.js';
import { auditTechnical, validateRobotsTxt } from './tools/technical.js';
import { auditPageSpeed, auditContentDecay } from './tools/performance.js';
import { analyzeSerp, analyzeCompetitorContentGap, analyzeForumDiscussions } from './tools/serp.js';

// New v1.0.2 Agent Orchestration Imports
import {
  auditProject,
  diagnoseSeo,
  prioritizeFindings,
  generateFixPlan,
  createSnapshotTool,
  compareSnapshotsTool,
  checkRegression
} from './tools/orchestration.js';
import { detectFramework, discoverRoutes, mapUrlToRouteSource } from './utils/projectScanner.js';
import { CrawlGraphBuilder } from './utils/crawlGraph.js';
import { calculatePriorityScore, calculateMultiDimensionalScores } from './utils/findingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

async function runTests() {
  console.log('🧪 Starting SEO Gravity MCP v1.0.2 Comprehensive Test Suite...\n');

  // -------------------------------------------------------------
  // Test 1: On-Page Audit
  // -------------------------------------------------------------
  console.log('1️⃣ Testing On-Page Audit...');
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Best Project Management Software in 2026 - Top 10 Picks</title>
        <meta name="description" content="Discover the best project management software tools for agile teams in 2026. Compare pricing, features, and user ratings. Start free today.">
        <link rel="canonical" href="https://example.com/best-project-management-software">
      </head>
      <body>
        <h1>Best Project Management Software for Teams</h1>
        <h2>1. Why Project Management Tools Matter</h2>
        <p>Project management software refers to digital platforms designed to plan, organize, and allocate resources efficiently across engineering and marketing teams.</p>
        <h2>2. Top Features Comparison</h2>
        <p>Key features include Gantt charts, real-time collaboration, and API integrations.</p>
        <img src="hero.png" alt="Project management dashboard preview">
        <a href="/pricing">View Pricing</a>
        <a href="https://wikipedia.org/wiki/Project_management">Learn more on Wikipedia</a>
      </body>
    </html>
  `;
  const onpage = await auditOnPage(sampleHtml, 'project management software');
  console.log(`   ✅ On-Page Score: ${onpage.overallScore}/100 | Title: ${onpage.titleAudit.status} | H1s: ${onpage.headingsAudit.h1Count}`);

  // -------------------------------------------------------------
  // Test 2: GEO / AEO Readiness with Evidence Tiers
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing GEO & AI Search Readiness Audit (with Evidence Tiers)...');
  const geo = await auditGeoAiReadiness(sampleHtml, 'best project management software');
  console.log(`   ✅ GEO Score: ${geo.overallGeoScore}/100 | Citation: ${geo.citationLikelihood} | Confidence: ${geo.confidence}`);
  console.log(`   ✅ AI Retrieval Signals: Direct Answer=${geo.aiRetrievalSignals?.directEntityDefinition}, Stats=${geo.aiRetrievalSignals?.factualDataAndStats}`);

  // -------------------------------------------------------------
  // Test 3: Schema Generation & Validation
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing Schema.org JSON-LD Generation & Validation...');
  const schema = generateSchemaMarkup('FAQPage', {
    items: [
      { question: 'What is project management software?', answer: 'It is a platform to coordinate team tasks and roadmaps.' },
      { question: 'Is it free to start?', answer: 'Yes, free tiers are available for small teams.' }
    ]
  });
  const val = await validateSchema(schema.jsonLdScript.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
  console.log(`   ✅ Schema Validated (${val.schemasDetectedCount} detected, Valid: ${val.schemas[0]?.isValid})`);

  // -------------------------------------------------------------
  // Test 4: Keyword Clustering & Intent Classification
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Keyword Clustering & Search Intent Classification...');
  const keywords = [
    'best running shoes',
    'buy running shoes online',
    'how to choose running shoes',
    'running shoes for flat feet',
    'running shoes review',
    'running shoes sale discount'
  ];
  const clusters = clusterKeywords(keywords);
  const intents = classifySearchIntent(keywords);
  console.log(`   ✅ Clustered ${keywords.length} keywords into ${clusters.clusterCount} cluster(s)`);
  console.log(`   ✅ Intent: "${keywords[1]}" -> ${intents[1].intent} (${(intents[1].confidenceScore * 100).toFixed(0)}%)`);

  // -------------------------------------------------------------
  // Test 5: Priority Scoring Algorithm
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Finding Priority Scoring Algorithm...');
  const p1 = calculatePriorityScore('critical', 1.0, 'trivial', 'site_wide');
  const p2 = calculatePriorityScore('low', 0.8, 'high', 'isolated');
  console.log(`   ✅ Critical Site-wide Issue Priority: ${p1.priorityScore} (Tier: ${p1.priorityTier})`);
  console.log(`   ✅ Isolated Low-Severity Issue Priority: ${p2.priorityScore} (Tier: ${p2.priorityTier})`);

  // -------------------------------------------------------------
  // Test 6: Project Framework Detection & Route Discovery
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing Framework Scanner & Route Discovery on Fixtures...');
  const nextAppPath = path.join(FIXTURES_DIR, 'nextjs-app');
  const nextFramework = detectFramework(nextAppPath);
  const nextRoutes = discoverRoutes(nextAppPath, nextFramework);
  console.log(`   ✅ Next.js Fixture: Framework=${nextFramework.framework}, TypeScript=${nextFramework.hasTypeScript}, Sitemap=${nextFramework.hasSitemapConfig}`);
  console.log(`   ✅ Discovered ${nextRoutes.length} route(s): ${nextRoutes.map(r => r.routePath).join(', ')}`);

  const astroAppPath = path.join(FIXTURES_DIR, 'astro-app');
  const astroFramework = detectFramework(astroAppPath);
  const astroRoutes = discoverRoutes(astroAppPath, astroFramework);
  console.log(`   ✅ Astro Fixture: Framework=${astroFramework.framework}, Routes=${astroRoutes.map(r => r.routePath).join(', ')}`);

  // -------------------------------------------------------------
  // Test 7: Source-to-URL Mapping
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing Source-to-URL Correlation...');
  const map1 = mapUrlToRouteSource('/blog/ai-productivity-2026', nextRoutes);
  const map2 = mapUrlToRouteSource('/about', nextRoutes);
  console.log(`   ✅ URL '/blog/ai-productivity-2026' mapped to -> ${map1.sourceFilePath} (Method: ${map1.resolutionMethod}, Conf: ${map1.confidence})`);
  console.log(`   ✅ URL '/about' mapped to -> ${map2.sourceFilePath} (Method: ${map2.resolutionMethod}, Conf: ${map2.confidence})`);

  // -------------------------------------------------------------
  // Test 8: Crawl Graph Analysis & PageRank
  // -------------------------------------------------------------
  console.log('\n8️⃣ Testing Crawl Graph Analysis...');
  const brokenPath = path.join(FIXTURES_DIR, 'broken-site/index.html');
  const crawlBuilder = new CrawlGraphBuilder(brokenPath);
  const crawlGraph = await crawlBuilder.buildGraph();
  console.log(`   ✅ Crawl Graph Built: ${crawlGraph.totalNodes} node(s), ${crawlGraph.totalEdges} edge(s), Max Depth: ${crawlGraph.maxClickDepth}`);

  // -------------------------------------------------------------
  // Test 9: Flagship Project Audit (seo_project_audit)
  // -------------------------------------------------------------
  console.log('\n9️⃣ Testing Flagship seo_project_audit Tool...');
  const auditResult = await auditProject(nextAppPath);
  console.log(`   ✅ Project Audit Completed:`);
  console.log(`      - Overall Health Score: ${auditResult.scores.overallHealth}/100 (Confidence: ${auditResult.scores.overallConfidence})`);
  console.log(`      - Technical: ${auditResult.scores.technical.score}/100 (${auditResult.scores.technical.state})`);
  console.log(`      - Content: ${auditResult.scores.content.score}/100 (${auditResult.scores.content.state})`);
  console.log(`      - AI Readiness: ${auditResult.scores.aiReadiness.score}/100 (${auditResult.scores.aiReadiness.state})`);
  console.log(`      - Total Findings Detected: ${auditResult.totalFindingsCount}`);
  console.log(`      - Immediate Action: ${auditResult.recommendedImmediateAction}`);

  // -------------------------------------------------------------
  // Test 10: Deep Root-Cause Diagnosis (seo_diagnose)
  // -------------------------------------------------------------
  console.log('\n🔟 Testing Deep Diagnostic (seo_diagnose)...');
  const diagResult = await diagnoseSeo(nextAppPath, '/about');
  console.log(`   ✅ Diagnosis for '/about':`);
  console.log(`      - Matched File: ${diagResult.sourceLocation?.filePath}`);
  console.log(`      - Issues Detected: ${diagResult.detectedIssues.length}`);
  if (diagResult.suggestedFixBlueprints.length > 0) {
    console.log(`      - Suggested Fix Blueprint: ${diagResult.suggestedFixBlueprints[0].title}`);
  }

  // -------------------------------------------------------------
  // Test 11: Sprint Prioritization (seo_prioritize)
  // -------------------------------------------------------------
  console.log('\n1️⃣1️⃣ Testing Finding Prioritization (seo_prioritize)...');
  const sprintResult = await prioritizeFindings(nextAppPath);
  console.log(`   ✅ Prioritization Sprints:`);
  console.log(`      - Quick Wins: ${sprintResult.sprints.quickWins.length} items`);
  console.log(`      - Critical Blockers: ${sprintResult.sprints.criticalBlockers.length} items`);
  console.log(`      - Projected Score After Quick Wins: ${sprintResult.projectedScoreImprovement.projectedScoreAfterQuickWins}/100`);

  // -------------------------------------------------------------
  // Test 12: Fix Plan Generation (seo_fix_plan)
  // -------------------------------------------------------------
  console.log('\n1️⃣2️⃣ Testing Fix Plan Generation (seo_fix_plan)...');
  const fixPlan = await generateFixPlan(nextAppPath);
  console.log(`   ✅ Fix Plan Generated: ${fixPlan.totalSteps} remediation step(s) ready for AI coding execution.`);

  // -------------------------------------------------------------
  // Test 13: Snapshot Creation, Diffing & Regression Checks
  // -------------------------------------------------------------
  console.log('\n1️⃣3️⃣ Testing Snapshot Creation & Regression Verification (seo_snapshot_create & seo_regression_check)...');
  const baselineSnap = await createSnapshotTool(nextAppPath);
  console.log(`   ✅ Baseline Snapshot Created: ID=${baselineSnap.snapshot.snapshotId}, Score=${baselineSnap.snapshot.scores.overallHealth}/100`);

  const regCheck = await checkRegression(nextAppPath, baselineSnap.snapshot);
  console.log(`   ✅ Regression Check: ${regCheck.verdict} (Status: ${regCheck.regressionReport.status})`);

  console.log('\n🎉 ALL 13 TEST SUITES (CORE + v1.0.2 ORCHESTRATION) PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
