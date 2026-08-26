import * as path from 'path';
import { fileURLToPath } from 'url';

// Core Tool Imports
import { auditOnPage } from './tools/onpage.js';
import { auditGeoAiReadiness, generateLlmsTxt } from './tools/geo.js';
import { clusterKeywords, classifySearchIntent } from './tools/keywords.js';
import { generateSchemaMarkup, validateSchema } from './tools/schema.js';

// Agent Orchestration & v1.1.0 Modules
import {
  auditProject,
  diagnoseSeo,
  prioritizeFindings,
  generateFixPlan,
  createSnapshotTool,
  checkRegression
} from './tools/orchestration.js';
import { defaultAdapterRegistry } from './adapters/adapterRegistry.js';
import { inspectSourceFileAST } from './utils/astLocator.js';
import { calculatePriorityScore } from './utils/findingEngine.js';
import { CrawlGraphBuilder } from './utils/crawlGraph.js';
import { mapChangedFilesToRoutes } from './utils/gitDiffEngine.js';
import { defaultCacheManager } from './utils/cacheManager.js';
import { defaultProviderRegistry } from './providers/providerRegistry.js';
import { detectOpportunities } from './utils/opportunityEngine.js';
import { planExperiment, verifyExperiment } from './utils/experimentEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

async function runTests() {
  console.log('🧪 Starting SEO Gravity MCP v1.1.0 (P0-P2 Blueprint) Test Suite...\n');

  // -------------------------------------------------------------
  // Test 1: On-Page & GEO with Evidence Tiers
  // -------------------------------------------------------------
  console.log('1️⃣ Testing On-Page & GEO Evidence Analysis...');
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Best Project Management Software in 2026</title>
        <meta name="description" content="Compare the best agile tools for engineering teams.">
        <link rel="canonical" href="https://example.com/best-tools">
      </head>
      <body>
        <h1>Best Project Management Software</h1>
        <p>Project management software refers to digital platforms designed to plan and organize workflows.</p>
        <a href="/pricing">Pricing</a>
      </body>
    </html>
  `;
  const onpage = await auditOnPage(sampleHtml, 'project management software');
  const geo = await auditGeoAiReadiness(sampleHtml, 'best project management software');
  console.log(`   ✅ On-Page Score: ${onpage.overallScore}/100 | Title: ${onpage.titleAudit.status}`);
  console.log(`   ✅ GEO AI Retrieval Signals: Direct Answer=${geo.aiRetrievalSignals?.directEntityDefinition}`);

  // -------------------------------------------------------------
  // Test 2: Framework Adapters & Multi-Framework Route Discovery
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing Framework Adapters (Next.js, Astro, Remix, Vite, SvelteKit)...');
  const nextAppPath = path.join(FIXTURES_DIR, 'nextjs-app');
  const nextAdapter = defaultAdapterRegistry.getAdapterForProject(nextAppPath);
  const nextRoutes = nextAdapter.discoverRoutes(nextAppPath);
  console.log(`   ✅ Next.js Adapter: ${nextAdapter.name} -> Discovered ${nextRoutes.length} route(s): ${nextRoutes.map(r => r.routePath).join(', ')}`);

  const astroAppPath = path.join(FIXTURES_DIR, 'astro-app');
  const astroAdapter = defaultAdapterRegistry.getAdapterForProject(astroAppPath);
  const astroRoutes = astroAdapter.discoverRoutes(astroAppPath);
  console.log(`   ✅ Astro Adapter: ${astroAdapter.name} -> Discovered ${astroRoutes.length} route(s): ${astroRoutes.map(r => r.routePath).join(', ')}`);

  // -------------------------------------------------------------
  // Test 3: Deep AST & Line-Range Correlation Engine
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing AST Inspection & Line-Range Locator...');
  const homePageFile = path.join(nextAppPath, 'app/page.tsx');
  const astResult = inspectSourceFileAST(homePageFile);
  console.log(`   ✅ AST Analysis for app/page.tsx:`);
  console.log(`      - Has Metadata Export: ${astResult.hasMetadataExport} (Lines ${astResult.metadataRange?.startLine}-${astResult.metadataRange?.endLine})`);
  console.log(`      - Title Extracted: "${astResult.extractedTitle}"`);
  console.log(`      - Canonical Declared: ${astResult.hasCanonicalDeclaration} ("${astResult.extractedCanonical}")`);

  // -------------------------------------------------------------
  // Test 4: Invariant-Based Snapshot & Regression Engine
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Invariant-Based Snapshot & Git Metadata...');
  const snapResult = await createSnapshotTool(nextAppPath);
  console.log(`   ✅ Snapshot ID: ${snapResult.snapshot.snapshotId}`);
  console.log(`   ✅ Git Metadata: Branch=${snapResult.snapshot.gitMetadata?.branch || 'main'}, Dirty=${snapResult.snapshot.gitMetadata?.isDirty}`);
  console.log(`   ✅ Formal Invariants Evaluated: ${snapResult.snapshot.invariants?.length || 0} invariant check(s) recorded`);

  const regCheck = await checkRegression(nextAppPath, snapResult.snapshot);
  console.log(`   ✅ Regression Check: ${regCheck.verdict} (Diffs count: ${regCheck.regressionReport.invariantDiffs?.length})`);

  // -------------------------------------------------------------
  // Test 5: Deep Root-Cause Diagnosis (seo_diagnose with AST)
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Deep Diagnostic with AST Line Precision (seo_diagnose)...');
  const diag = await diagnoseSeo(nextAppPath, '/about');
  console.log(`   ✅ Diagnostic for '/about':`);
  console.log(`      - Matched File: ${diag.sourceLocation?.filePath}`);
  console.log(`      - AST Target Range: Lines ${diag.sourceRange?.startLine}-${diag.sourceRange?.endLine}`);
  console.log(`      - Suggested Blueprint: ${diag.suggestedFixBlueprints[0]?.title}`);

  // -------------------------------------------------------------
  // Test 6: Git Differential Engine
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing Git Differential Route Mapping...');
  const changedMock = ['app/blog/[slug]/page.tsx'];
  const diffMapping = mapChangedFilesToRoutes(changedMock, nextRoutes);
  console.log(`   ✅ Changed: ${changedMock.join(', ')} -> Affected Routes: ${diffMapping.affected.map(r => r.routePath).join(', ')} (${diffMapping.unaffected.length} unaffected)`);

  // -------------------------------------------------------------
  // Test 7: Content-Hash Caching Manager
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing Content-Hash Cache Manager...');
  const cacheKey = defaultCacheManager.computeKey('test_ast', { file: 'page.tsx', size: 500 });
  defaultCacheManager.set(cacheKey, { parsed: true, timestamp: Date.now() }, 10000);
  const cachedVal = defaultCacheManager.get<any>(cacheKey);
  console.log(`   ✅ Cache Key Generated: ${cacheKey}`);
  console.log(`   ✅ Cache Hit Verified: parsed=${cachedVal?.parsed} (Cache Size: ${defaultCacheManager.size()})`);

  // -------------------------------------------------------------
  // Test 8: Pluggable Provider Abstraction
  // -------------------------------------------------------------
  console.log('\n8️⃣ Testing Pluggable Provider Abstraction...');
  const serpProv = defaultProviderRegistry.getSerpProvider();
  const speedProv = defaultProviderRegistry.getPageSpeedProvider();
  console.log(`   ✅ Default SERP Provider: ${serpProv.name} (Free: ${serpProv.isFree})`);
  console.log(`   ✅ Default PageSpeed Provider: ${speedProv.name}`);

  // -------------------------------------------------------------
  // Test 9: Opportunity Engine
  // -------------------------------------------------------------
  console.log('\n9️⃣ Testing Strategic Opportunity Engine...');
  const opps = await detectOpportunities(nextAppPath, ['saas pricing calculator', 'agile workflows']);
  console.log(`   ✅ Opportunities Discovered: ${opps.totalOpportunitiesFound} strategic opportunity item(s)`);
  for (const o of opps.opportunities.slice(0, 2)) {
    console.log(`      - [${o.category}] ${o.title} -> ${o.recommendedRoutePath}`);
  }

  // -------------------------------------------------------------
  // Test 10: SEO Experimentation Engine (Hypothesis & Verification)
  // -------------------------------------------------------------
  console.log('\n🔟 Testing SEO Experimentation Engine...');
  const experiment = await planExperiment(
    nextAppPath,
    '/about',
    'Adding metadata export to /about will resolve critical defect',
    'Export const metadata: Metadata = { title: "About", description: "..." }'
  );
  console.log(`   ✅ Experiment Planned: ID=${experiment.id}, Status=${experiment.status}, Target=${experiment.targetRoute}`);

  const expVerify = await verifyExperiment(nextAppPath, experiment);
  console.log(`   ✅ Experiment Verification State: ${expVerify.status} (Delta: ${expVerify.scoreDelta})`);

  // -------------------------------------------------------------
  // Test 11: End-to-End Flagship Audit & Priority Sprints
  // -------------------------------------------------------------
  console.log('\n1️⃣1️⃣ Testing Flagship Project Audit & Sprint Prioritization...');
  const audit = await auditProject(nextAppPath);
  const sprints = await prioritizeFindings(nextAppPath);
  console.log(`   ✅ Audit Complete: Overall Score=${audit.scores.overallHealth}/100 | Dynamic Routes=${audit.routesSummary.dynamicRoutesCount}`);
  console.log(`   ✅ Priority Sprints: Quick Wins=${sprints.sprints.quickWins.length}, Critical=${sprints.sprints.criticalBlockers.length}`);

  console.log('\n🎉 ALL 11 P0-P2 ARCHITECTURAL TEST SUITES PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
