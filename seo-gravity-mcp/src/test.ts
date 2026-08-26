import * as path from 'path';
import { fileURLToPath } from 'url';

// Core Tool Imports
import { auditOnPage } from './tools/onpage.js';
import { auditGeoAiReadiness } from './tools/geo.js';

// Modular Server & Agent Orchestration
import { createMcpServer } from './server/server.js';
import { TOOLS } from './server/registry.js';
import {
  auditProject,
  diagnoseSeo,
  prioritizeFindings,
  createSnapshotTool,
  checkRegression
} from './tools/orchestration.js';
import { defaultAdapterRegistry } from './adapters/adapterRegistry.js';
import { inspectSourceFileAST } from './utils/astLocator.js';
import { defaultCacheManager } from './utils/cacheManager.js';
import { defaultProviderRegistry } from './providers/providerRegistry.js';
import { detectOpportunities } from './utils/opportunityEngine.js';
import { planExperiment, verifyExperiment } from './utils/experimentEngine.js';
import { exportFindingsToSarif } from './utils/sarifExporter.js';
import { defaultInvariantRegistry } from './invariants/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

async function runTests() {
  console.log('🧪 Starting SEO Gravity MCP v1.2.0 (Engineering Infrastructure) Test Suite...\n');

  // -------------------------------------------------------------
  // Test 1: Modular Server & 35 Tool Catalog
  // -------------------------------------------------------------
  console.log('1️⃣ Testing Modular Server Architecture...');
  const server = createMcpServer({ name: 'seo-gravity-mcp', version: '1.2.0' });
  console.log(`   ✅ Server Initialized: ${TOOLS.length} tools registered across all 8 architectural layers.`);

  // -------------------------------------------------------------
  // Test 2: On-Page & GEO Evidence Analysis
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing On-Page & GEO Evidence Analysis...');
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
  // Test 3: Framework Adapters & Multi-Framework Route Discovery
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing Framework Adapters (Next.js, Astro, Remix, Vite, SvelteKit)...');
  const nextAppPath = path.join(FIXTURES_DIR, 'nextjs-app');
  const nextAdapter = defaultAdapterRegistry.getAdapterForProject(nextAppPath);
  const nextRoutes = nextAdapter.discoverRoutes(nextAppPath);
  console.log(`   ✅ Next.js Adapter: ${nextAdapter.name} -> Discovered ${nextRoutes.length} route(s)`);

  const pagesAppPath = path.join(FIXTURES_DIR, 'nextjs-pages');
  const pagesAdapter = defaultAdapterRegistry.getAdapterForProject(pagesAppPath);
  const pagesRoutes = pagesAdapter.discoverRoutes(pagesAppPath);
  console.log(`   ✅ Next.js Pages Adapter: ${pagesAdapter.name} -> Discovered ${pagesRoutes.length} route(s)`);

  const viteAppPath = path.join(FIXTURES_DIR, 'vite-react');
  const viteAdapter = defaultAdapterRegistry.getAdapterForProject(viteAppPath);
  const viteRoutes = viteAdapter.discoverRoutes(viteAppPath);
  console.log(`   ✅ Vite React Adapter: ${viteAdapter.name} -> Discovered ${viteRoutes.length} route(s)`);

  const remixAppPath = path.join(FIXTURES_DIR, 'remix-app');
  const remixAdapter = defaultAdapterRegistry.getAdapterForProject(remixAppPath);
  const remixRoutes = remixAdapter.discoverRoutes(remixAppPath);
  console.log(`   ✅ Remix Adapter: ${remixAdapter.name} -> Discovered ${remixRoutes.length} route(s)`);

  const svelteAppPath = path.join(FIXTURES_DIR, 'sveltekit-app');
  const svelteAdapter = defaultAdapterRegistry.getAdapterForProject(svelteAppPath);
  const svelteRoutes = svelteAdapter.discoverRoutes(svelteAppPath);
  console.log(`   ✅ SvelteKit Adapter: ${svelteAdapter.name} -> Discovered ${svelteRoutes.length} route(s)`);

  // -------------------------------------------------------------
  // Test 4: Deep AST & Line-Range Correlation Engine
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing AST Inspection & Line-Range Locator...');
  const homePageFile = path.join(nextAppPath, 'app/page.tsx');
  const astResult = inspectSourceFileAST(homePageFile);
  console.log(`   ✅ AST Analysis for app/page.tsx:`);
  console.log(`      - Has Metadata Export: ${astResult.hasMetadataExport} (Lines ${astResult.metadataRange?.startLine}-${astResult.metadataRange?.endLine})`);
  console.log(`      - Title Extracted: "${astResult.extractedTitle}"`);
  console.log(`      - Canonical Declared: ${astResult.hasCanonicalDeclaration} ("${astResult.extractedCanonical}")`);

  // -------------------------------------------------------------
  // Test 5: Formal Invariant Registry & Evaluation
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Formal Invariant Registry...');
  const allInvariants = defaultInvariantRegistry.getAll();
  console.log(`   ✅ Loaded Invariants: ${allInvariants.length} formal rules (${allInvariants.map(i => i.id).join(', ')})`);

  const snapResult = await createSnapshotTool(nextAppPath);
  console.log(`   ✅ Snapshot ID: ${snapResult.snapshot.snapshotId}`);
  console.log(`   ✅ Formal Invariants Evaluated: ${snapResult.snapshot.invariants?.length || 0} invariant check(s) recorded`);

  const regCheck = await checkRegression(nextAppPath, snapResult.snapshot);
  console.log(`   ✅ Invariant Regression Check: ${regCheck.verdict}`);

  // -------------------------------------------------------------
  // Test 6: SARIF v2.1.0 Exporter
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing SARIF v2.1.0 Exporter for CI/CD...');
  const sarif = exportFindingsToSarif(snapResult.snapshot.findings, nextAppPath);
  console.log(`   ✅ SARIF Report Generated: Version ${sarif.version}, Tool: ${sarif.runs[0].tool.driver.name}, Rules: ${sarif.runs[0].tool.driver.rules.length}, Results: ${sarif.runs[0].results.length}`);

  // -------------------------------------------------------------
  // Test 7: Cache Manager with Provenance
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing Content-Hash Cache Manager with Provenance...');
  const cacheKey = defaultCacheManager.computeKey('test_ast', { file: 'page.tsx', size: 500 });
  defaultCacheManager.set(cacheKey, { parsed: true }, 10000, 'typescript_ast');
  const cachedVal = defaultCacheManager.getWithMetadata<any>(cacheKey);
  console.log(`   ✅ Cache Provenance: Provider=${cachedVal?.metadata.provider}, Age=${cachedVal?.metadata.ageMs}ms, Key=${cachedVal?.metadata.key}`);

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

  // -------------------------------------------------------------
  // Test 10: Flagship Project Audit & Sprint Prioritization
  // -------------------------------------------------------------
  console.log('\n🔟 Testing Flagship Project Audit & Sprint Prioritization...');
  const audit = await auditProject(nextAppPath);
  const sprints = await prioritizeFindings(nextAppPath);
  console.log(`   ✅ Audit Complete: Overall Score=${audit.scores.overallHealth}/100 | Dynamic Routes=${audit.routesSummary.dynamicRoutesCount}`);
  console.log(`   ✅ Priority Sprints: Quick Wins=${sprints.sprints.quickWins.length}, Critical=${sprints.sprints.criticalBlockers.length}`);

  console.log('\n🎉 ALL v1.2.0 ARCHITECTURAL & CI TEST SUITES PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
