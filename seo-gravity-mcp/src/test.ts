import assert from 'node:assert/strict';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Core Imports
import { createMcpServer } from './server/server.js';
import { TOOLS } from './server/registry.js';
import {
  auditProject,
  prioritizeFindings,
  createSnapshotTool,
  checkRegression,
  compareSnapshotsTool
} from './tools/orchestration.js';
import { defaultAdapterRegistry } from './adapters/adapterRegistry.js';
import { defaultCacheManager } from './utils/cacheManager.js';
import { exportFindingsToSarif } from './utils/sarifExporter.js';
import { defaultInvariantRegistry } from './invariants/registry.js';
import { PolicyLoader } from './policy/loader.js';
import { BUILTIN_PROFILES } from './policy/profiles.js';
import { formatPrCommentMarkdown } from './utils/prCommentFormatter.js';
import { analyzeSemanticFileChange } from './utils/gitDiffEngine.js';
import { compareSnapshots } from './utils/snapshotEngine.js';
import { InvariantDiffItem } from './types/canonical.js';
import { VERSION, PACKAGE_NAME } from './version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../test/fixtures');

async function runTests() {
  console.log(`🧪 Starting ${PACKAGE_NAME} v${VERSION} Rigorous Assertion Test Suite...\n`);

  // -------------------------------------------------------------
  // Test 1: Modular Server & 35 Tool Catalog
  // -------------------------------------------------------------
  console.log('1️⃣ Testing Modular Server Architecture & Version Handshake...');
  const server = createMcpServer({ name: PACKAGE_NAME, version: VERSION });
  assert.ok(server, 'Server instance should be successfully created');
  assert.equal(TOOLS.length, 35, 'Expected exactly 35 tools in catalog');
  console.log(`   ✅ Server Initialized: ${TOOLS.length} tools registered across all architectural layers.`);

  // -------------------------------------------------------------
  // Test 2: Invariant Truth & Requirement Levels (P0)
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing Invariant Truth System & Requirement Levels...');
  const allInvariants = defaultInvariantRegistry.getAll();
  const reqCount = allInvariants.filter(i => i.requirementLevel === 'REQUIRED').length;
  const condCount = allInvariants.filter(i => i.requirementLevel === 'CONDITIONAL').length;
  const recCount = allInvariants.filter(i => i.requirementLevel === 'RECOMMENDED').length;

  assert.equal(reqCount, 2, 'Expected 2 REQUIRED invariants (HTTP 200, Title)');
  assert.equal(condCount, 3, 'Expected 3 CONDITIONAL invariants (Canonical, Link, Robots)');
  assert.equal(recCount, 2, 'Expected 2 RECOMMENDED invariants (Sitemap, LLMS.txt)');

  const llmsInv = defaultInvariantRegistry.evaluateContext(
    'INV-LLMS-TXT',
    { url: '/llms.txt', logicalPageId: 'site_root', hasLlmsTxt: false },
    { analyzer: 'test', source: 'route_config', timestamp: new Date().toISOString(), provider: 'test' }
  );
  assert.ok(llmsInv);
  assert.equal(llmsInv.satisfied, false);
  assert.equal(llmsInv.requirementLevel, 'RECOMMENDED');
  console.log(`   ✅ Non-dogmatic /llms.txt evaluation: RequirementLevel=RECOMMENDED (Does not block CI gates)`);

  // -------------------------------------------------------------
  // Test 3: YAML Parsing & Project Policy Engine (.seo-gravity.yml) (P0 & P1)
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing Full Nested YAML Parser & Policy Engine...');
  const mockYaml = `
version: 1
profile: strict
policy:
  canonical: required
  sitemap: required
regression:
  fail_on_levels: [REQUIRED, CONDITIONAL, RECOMMENDED]
  fail_on_severities: [critical, high, medium]
  allow_expected_changes: false
  max_allowed_regressions: 2
`;
  const parsedYaml = PolicyLoader.parseYaml(mockYaml);
  assert.equal(parsedYaml.version, 1);
  assert.equal(parsedYaml.profile, 'strict');
  assert.equal(parsedYaml.policy.canonical, 'required');
  assert.deepEqual(parsedYaml.regression.fail_on_levels, ['REQUIRED', 'CONDITIONAL', 'RECOMMENDED']);

  const balanced = PolicyLoader.resolvePolicy('.');
  assert.equal(balanced.profile, 'balanced');
  assert.deepEqual(balanced.regression?.failOnLevels, ['REQUIRED', 'CONDITIONAL']);
  console.log(`   ✅ YAML Parser & Policy Profiles Verified.`);

  // -------------------------------------------------------------
  // Test 4: Invariant Disappearance & Policy-Governed CI Gate (P0)
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Invariant Union Comparison & Disappearing Invariants...');
  const fakeBaseline: any = {
    snapshotId: 'snap_base',
    createdAt: new Date().toISOString(),
    projectPath: '.',
    frameworkInfo: { framework: 'nextjs-app-router', name: 'Next.js', version: '14.0.0', confidence: 1.0 },
    discoveredRoutes: [{ routePath: '/deleted-route', routeType: 'page', sourceFilePath: 'app/deleted/page.tsx', hasHeadComponent: false }],
    scores: { overallHealth: 100, overallConfidence: 'High', totalEvidenceSignals: 10, technical: { score: 100, state: 'healthy' }, content: { score: 100, state: 'healthy' }, discoverability: { score: 100, state: 'healthy' }, authority: { score: 100, state: 'healthy' }, entity: { score: 100, state: 'healthy' }, performance: { score: 100, state: 'healthy' }, aiReadiness: { score: 100, state: 'healthy' } },
    findings: [],
    invariants: [
      { id: 'INV-HTTP-200', logicalPageId: 'page_1', url: '/deleted-route', description: 'HTTP 200', expectedCondition: '200', observedCondition: '200', satisfied: true, requirementLevel: 'REQUIRED', severity: 'critical', provenance: { analyzer: 'test', source: 'http_headers', timestamp: '', provider: 'test' } }
    ],
    routeMappings: []
  };

  const fakeCurrentActiveRouteMissingEvidence: any = {
    ...fakeBaseline,
    snapshotId: 'snap_curr',
    discoveredRoutes: [{ routePath: '/deleted-route', routeType: 'page', sourceFilePath: 'app/deleted/page.tsx', hasHeadComponent: false }],
    invariants: [] // Active route missing invariant evidence
  };

  const diffReport1 = compareSnapshots(fakeBaseline, fakeCurrentActiveRouteMissingEvidence);
  assert.equal(diffReport1.invariantDiffs?.length, 1);
  assert.equal(diffReport1.invariantDiffs![0].status, 'NEW_REGRESSION', 'Disappearing satisfied invariant on active route must trigger regression');

  const fakeCurrentRouteDeleted: any = {
    ...fakeBaseline,
    snapshotId: 'snap_curr',
    discoveredRoutes: [], // Route intentionally removed from project
    invariants: []
  };

  const diffReport2 = compareSnapshots(fakeBaseline, fakeCurrentRouteDeleted);
  assert.equal(diffReport2.invariantDiffs?.length, 1);
  assert.equal(diffReport2.invariantDiffs![0].status, 'EXPECTED_CHANGE', 'Disappearing invariant for removed route must be tagged EXPECTED_CHANGE');
  console.log('   ✅ Invariant Union Diffing: Active route missing evidence -> NEW_REGRESSION; Deleted route -> EXPECTED_CHANGE.');

  // -------------------------------------------------------------
  // Test 5: Policy-Matrix Evaluation
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Policy Matrix Evaluation Across Profiles & Thresholds...');
  const lowRecDiff: InvariantDiffItem = {
    invariantId: 'INV-LLMS-TXT',
    logicalPageId: 'site_root',
    url: '/llms.txt',
    status: 'NEW_REGRESSION',
    baselineSatisfied: true,
    currentSatisfied: false,
    requirementLevel: 'RECOMMENDED',
    severity: 'low',
    message: 'llms.txt missing'
  };

  const criticalReqDiff: InvariantDiffItem = {
    invariantId: 'INV-HTTP-200',
    logicalPageId: 'page_home',
    url: '/',
    status: 'NEW_REGRESSION',
    baselineSatisfied: true,
    currentSatisfied: false,
    requirementLevel: 'REQUIRED',
    severity: 'critical',
    message: 'HTTP 500 error'
  };

  // Profile strict fails on RECOMMENDED + low
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(lowRecDiff, BUILTIN_PROFILES.strict), true);
  // Profile balanced ignores RECOMMENDED + low
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(lowRecDiff, BUILTIN_PROFILES.balanced), false);
  // Profile startup ignores RECOMMENDED + low
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(lowRecDiff, BUILTIN_PROFILES.startup), false);

  // All profiles fail on REQUIRED + critical
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(criticalReqDiff, BUILTIN_PROFILES.strict), true);
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(criticalReqDiff, BUILTIN_PROFILES.balanced), true);
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(criticalReqDiff, BUILTIN_PROFILES.startup), true);

  // Invariant override: disabled policy
  const customPolicy = {
    ...BUILTIN_PROFILES.strict,
    invariants: {
      'INV-HTTP-200': { enabled: false }
    }
  };
  assert.equal(PolicyLoader.isRegressionBreachingPolicy(criticalReqDiff, customPolicy), false);

  // Gate evaluation with maxAllowedRegressions
  const gatePolicy = {
    ...BUILTIN_PROFILES.strict,
    regression: {
      ...BUILTIN_PROFILES.strict.regression,
      maxAllowedRegressions: 1
    }
  };
  const gatePass = PolicyLoader.evaluatePolicyGate([criticalReqDiff], gatePolicy);
  assert.equal(gatePass.pass, true, '1 breach with maxAllowedRegressions=1 must pass');
  const gateFail = PolicyLoader.evaluatePolicyGate([criticalReqDiff, criticalReqDiff], gatePolicy);
  assert.equal(gateFail.pass, false, '2 breaches with maxAllowedRegressions=1 must fail');
  console.log('   ✅ Policy Matrix: Strict, Balanced, Startup, Invariant Overrides, and maxAllowedRegressions verified.');

  // -------------------------------------------------------------
  // Test 6: Semantic SEO Diff & Risk Assessment (P1)
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing Semantic SEO Git Diff Engine...');
  const nextAppPath = path.join(FIXTURES_DIR, 'nextjs-app');
  const semChange = analyzeSemanticFileChange('app/page.tsx', nextAppPath);
  assert.equal(semChange.affectsMetadata, true);
  assert.equal(semChange.affectsCanonical, true);
  assert.equal(semChange.riskLevel, 'HIGH');
  assert.ok(semChange.likelyAffectedInvariants.includes('INV-TITLE-PRESENT'));
  console.log(`   ✅ Semantic Analysis for app/page.tsx: Risk=${semChange.riskLevel}`);

  // -------------------------------------------------------------
  // Test 7: Developer-Native PR Comment Formatter (P1)
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing Developer-Native GitHub PR Comment Formatter...');
  const snapResult = await createSnapshotTool(nextAppPath);
  const regCheck = await checkRegression(nextAppPath, snapResult.snapshot);
  assert.equal(regCheck.pass, true);
  const prComment = formatPrCommentMarkdown(regCheck.regressionReport, balanced, 'feat/seo-hardening');
  assert.ok(prComment.includes('SEO Gravity Quality Gate Report'));
  assert.ok(prComment.includes('PASSED'));
  console.log(`   ✅ PR Markdown Generated (${prComment.length} characters)`);

  // -------------------------------------------------------------
  // Test 8: 17 Framework Adapters + Unknown Adapter Coverage
  // -------------------------------------------------------------
  console.log('\n8️⃣ Testing Framework Adapters & Unknown Fallback...');
  const adapters = defaultAdapterRegistry.getAllAdapters();
  assert.equal(adapters.length, 17, 'Must have exactly 17 standard adapters loaded');
  const emptyFolderAdapter = defaultAdapterRegistry.getAdapterForProject('non_existent_folder_abc');
  assert.equal(emptyFolderAdapter.id, 'unknown');
  console.log(`   ✅ 17 Adapters Loaded + UnknownAdapter fallback verified.`);

  // -------------------------------------------------------------
  // Test 9: SARIF v2.1.0 Exporter
  // -------------------------------------------------------------
  console.log('\n9️⃣ Testing SARIF v2.1.0 Exporter for GitHub Security Tab...');
  const sarif = exportFindingsToSarif(snapResult.snapshot.findings, nextAppPath);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'SEO Gravity');
  console.log(`   ✅ SARIF Report Generated: Driver=${sarif.runs[0].tool.driver.name}, Version=${sarif.version}`);

  // -------------------------------------------------------------
  // Test 10: Content-Hash Cache Manager with Provenance & LRU
  // -------------------------------------------------------------
  console.log('\n🔟 Testing Cache Manager with Provenance & LRU...');
  const cacheKey = defaultCacheManager.computeKey('test_ast', { file: 'page.tsx' });
  defaultCacheManager.set(cacheKey, { parsed: true }, 10000, 'typescript_ast');
  const cachedVal = defaultCacheManager.getWithMetadata<any>(cacheKey);
  assert.ok(cachedVal);
  assert.equal(cachedVal.metadata.provider, 'typescript_ast');
  console.log(`   ✅ Cache Provenance: Provider=${cachedVal.metadata.provider}, Age=${cachedVal.metadata.ageMs}ms`);

  console.log(`\n🎉 ALL ${PACKAGE_NAME} v${VERSION} STRICT ASSERTION TEST SUITES PASSED CLEANLY!\n`);
}

runTests().catch(err => {
  console.error('❌ Test failed with assertion error:', err);
  process.exit(1);
});
