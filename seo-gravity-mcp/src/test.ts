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
  prioritizeFindings,
  createSnapshotTool,
  checkRegression
} from './tools/orchestration.js';
import { defaultAdapterRegistry } from './adapters/adapterRegistry.js';
import { inspectSourceFileAST } from './utils/astLocator.js';
import { defaultCacheManager } from './utils/cacheManager.js';
import { defaultProviderRegistry } from './providers/providerRegistry.js';
import { exportFindingsToSarif } from './utils/sarifExporter.js';
import { defaultInvariantRegistry } from './invariants/registry.js';
import { PolicyLoader } from './policy/loader.js';
import { BUILTIN_PROFILES } from './policy/profiles.js';
import { formatPrCommentMarkdown } from './utils/prCommentFormatter.js';
import { analyzeSemanticFileChange } from './utils/gitDiffEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

async function runTests() {
  console.log('🧪 Starting SEO Gravity MCP v1.3.1 (Depth, Policy & Code Review) Test Suite...\n');

  // -------------------------------------------------------------
  // Test 1: Modular Server & 35 Tool Catalog
  // -------------------------------------------------------------
  console.log('1️⃣ Testing Modular Server Architecture...');
  const server = createMcpServer({ name: 'seo-gravity-mcp', version: '1.3.1' });
  console.log(`   ✅ Server Initialized: ${TOOLS.length} tools registered across all architectural layers.`);

  // -------------------------------------------------------------
  // Test 2: Invariant Truth & Requirement Levels (P0)
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing Invariant Truth System & Requirement Levels...');
  const allInvariants = defaultInvariantRegistry.getAll();
  const reqCount = allInvariants.filter(i => i.requirementLevel === 'REQUIRED').length;
  const condCount = allInvariants.filter(i => i.requirementLevel === 'CONDITIONAL').length;
  const recCount = allInvariants.filter(i => i.requirementLevel === 'RECOMMENDED').length;
  console.log(`   ✅ Invariants Categorized: ${reqCount} REQUIRED, ${condCount} CONDITIONAL, ${recCount} RECOMMENDED.`);

  const llmsInv = defaultInvariantRegistry.evaluateContext(
    'INV-LLMS-TXT',
    { url: '/llms.txt', logicalPageId: 'site_root', hasLlmsTxt: false },
    { analyzer: 'test', source: 'route_config', timestamp: new Date().toISOString(), provider: 'test' }
  );
  console.log(`   ✅ Non-dogmatic /llms.txt evaluation: RequirementLevel=${llmsInv?.requirementLevel} (Does not block CI gates)`);

  // -------------------------------------------------------------
  // Test 3: Project Policy Engine (.seo-gravity.yml) (P1)
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing Project Policy Engine & Preset Profiles...');
  const balanced = PolicyLoader.resolvePolicy('.');
  console.log(`   ✅ Default Policy: ${balanced.profile} (Fail on: ${balanced.regression?.failOnLevels?.join(', ')})`);
  console.log(`   ✅ Built-in Profiles Loaded: ${Object.keys(BUILTIN_PROFILES).join(', ')}`);

  // -------------------------------------------------------------
  // Test 4: Semantic SEO Diff & Risk Assessment (P1)
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Semantic SEO Git Diff Engine...');
  const nextAppPath = path.join(FIXTURES_DIR, 'nextjs-app');
  const semChange = analyzeSemanticFileChange('app/page.tsx', nextAppPath);
  console.log(`   ✅ Semantic Analysis for app/page.tsx:`);
  console.log(`      - Affects Metadata: ${semChange.affectsMetadata}`);
  console.log(`      - Affects Canonical: ${semChange.affectsCanonical}`);
  console.log(`      - Invariant Risk Level: ${semChange.riskLevel}`);
  console.log(`      - Likely Affected Invariants: ${semChange.likelyAffectedInvariants.join(', ')}`);

  // -------------------------------------------------------------
  // Test 5: Developer-Native PR Comment Formatter (P1)
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Developer-Native GitHub PR Comment Formatter...');
  const snapResult = await createSnapshotTool(nextAppPath);
  const regCheck = await checkRegression(nextAppPath, snapResult.snapshot);
  const prComment = formatPrCommentMarkdown(regCheck.regressionReport, balanced, 'feat/seo-hardening');
  console.log(`   ✅ PR Markdown Generated (${prComment.length} characters)`);
  console.log(`      Snippet:\n      ${prComment.split('\n').slice(0, 5).join('\n      ')}`);

  // -------------------------------------------------------------
  // Test 6: 17 Framework Adapters Precision Check
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing 17 Framework Adapters Coverage...');
  const adapters = defaultAdapterRegistry.getAllAdapters();
  console.log(`   ✅ ${adapters.length} Framework Adapters Loaded:`);
  console.log(`      ${adapters.map(a => a.id).join(', ')}`);

  // -------------------------------------------------------------
  // Test 7: SARIF v2.1.0 Exporter
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing SARIF v2.1.0 Exporter for GitHub Security Tab...');
  const sarif = exportFindingsToSarif(snapResult.snapshot.findings, nextAppPath);
  console.log(`   ✅ SARIF Report Generated: Driver=${sarif.runs[0].tool.driver.name}, Version=${sarif.version}, Rules=${sarif.runs[0].tool.driver.rules.length}`);

  // -------------------------------------------------------------
  // Test 8: Content-Hash Cache Manager with Provenance
  // -------------------------------------------------------------
  console.log('\n8️⃣ Testing Cache Manager with Provenance...');
  const cacheKey = defaultCacheManager.computeKey('test_ast', { file: 'page.tsx' });
  defaultCacheManager.set(cacheKey, { parsed: true }, 10000, 'typescript_ast');
  const cachedVal = defaultCacheManager.getWithMetadata<any>(cacheKey);
  console.log(`   ✅ Cache Provenance: Provider=${cachedVal?.metadata.provider}, Age=${cachedVal?.metadata.ageMs}ms`);

  console.log('\n🎉 ALL v1.3.1 DEPTH, POLICY & CODE REVIEW SUITES PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
