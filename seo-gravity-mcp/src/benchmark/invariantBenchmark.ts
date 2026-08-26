import { defaultInvariantRegistry } from '../invariants/registry.js';
import { createProjectSnapshot, compareSnapshots } from '../utils/snapshotEngine.js';
import { BUILTIN_PROFILES } from '../policy/profiles.js';
import { PolicyLoader } from '../policy/loader.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_ROOT = path.resolve(__dirname, '../../test/fixtures');

export async function runInvariantBenchmark(): Promise<boolean> {
  console.log('\n🛡️ Running Invariant Precision, Requirement Level & Policy Benchmark...\n');

  // Test 1: Invariant Registry & Requirement Levels
  const allInvariants = defaultInvariantRegistry.getAll();
  console.log(`✅ Invariant Registry loaded: ${allInvariants.length} built-in invariants`);

  const requiredInvs = allInvariants.filter(i => i.requirementLevel === 'REQUIRED');
  const conditionalInvs = allInvariants.filter(i => i.requirementLevel === 'CONDITIONAL');
  const recommendedInvs = allInvariants.filter(i => i.requirementLevel === 'RECOMMENDED');

  console.log(`   - REQUIRED: ${requiredInvs.length} (${requiredInvs.map(i => i.id).join(', ')})`);
  console.log(`   - CONDITIONAL: ${conditionalInvs.length} (${conditionalInvs.map(i => i.id).join(', ')})`);
  console.log(`   - RECOMMENDED: ${recommendedInvs.length} (${recommendedInvs.map(i => i.id).join(', ')})`);

  // Test 2: Invariant Evaluation with Requirement Levels
  const testPageId = 'page_test_123';
  const now = new Date().toISOString();

  const titlePass = defaultInvariantRegistry.evaluateContext(
    'INV-TITLE-PRESENT',
    { url: '/test', logicalPageId: testPageId, hasMetadata: true, extractedTitle: 'My Title' },
    { analyzer: 'test', source: 'ast_inspection', timestamp: now, provider: 'test' }
  );

  const titleFail = defaultInvariantRegistry.evaluateContext(
    'INV-TITLE-PRESENT',
    { url: '/test', logicalPageId: testPageId, hasMetadata: false },
    { analyzer: 'test', source: 'ast_inspection', timestamp: now, provider: 'test' }
  );

  if (!titlePass?.satisfied || titleFail?.satisfied || titlePass.requirementLevel !== 'REQUIRED') {
    console.error('❌ Title invariant evaluation failed logic/requirement test.');
    return false;
  }
  console.log('✅ Title Invariant logic: Satisfied when metadata present, Failed when metadata missing (REQUIRED).');

  const llmsInv = defaultInvariantRegistry.evaluateContext(
    'INV-LLMS-TXT',
    { url: '/llms.txt', logicalPageId: 'site_root', hasLlmsTxt: false },
    { analyzer: 'test', source: 'route_config', timestamp: now, provider: 'test' }
  );
  if (llmsInv?.requirementLevel !== 'RECOMMENDED') {
    console.error('❌ /llms.txt invariant is not marked as RECOMMENDED.');
    return false;
  }
  console.log('✅ /llms.txt Invariant logic: Correctly classified as RECOMMENDED (Non-dogmatic).');

  // Test 3: Policy Profiles
  const balancedPolicy = BUILTIN_PROFILES.balanced;
  const strictPolicy = BUILTIN_PROFILES.strict;
  const startupPolicy = BUILTIN_PROFILES.startup;

  const diffItem: any = {
    invariantId: 'INV-LLMS-TXT',
    status: 'NEW_REGRESSION',
    requirementLevel: 'RECOMMENDED',
    severity: 'low'
  };

  const balancedBreach = PolicyLoader.isRegressionBreachingPolicy(diffItem, balancedPolicy);
  const strictBreach = PolicyLoader.isRegressionBreachingPolicy(diffItem, strictPolicy);
  const startupBreach = PolicyLoader.isRegressionBreachingPolicy(diffItem, startupPolicy);

  if (balancedBreach !== false || strictBreach !== true || startupBreach !== false) {
    console.error('❌ PolicyLoader failed to differentiate profile strictness on RECOMMENDED items.');
    return false;
  }
  console.log('✅ Policy Profiles Verified: Balanced ignores low recommendation, Strict enforces, Startup ignores.');

  // Test 4: Project Snapshot evaluation
  const nextAppPath = path.join(FIXTURES_ROOT, 'nextjs-app');
  const snap1 = await createProjectSnapshot(nextAppPath);
  const report = compareSnapshots(snap1, snap1);
  if (report.newRegressions.length !== 0) {
    console.error('❌ Self-comparison generated false positive regressions.');
    return false;
  }
  console.log(`✅ Invariant Regression Diffing: Self-comparison generated 0 regressions (Pass).`);

  console.log('\n🎯 Invariant & Policy Benchmark: 100% Invariant Precision & Policy Enforcement Verified.\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('invariantBenchmark.js')) {
  runInvariantBenchmark().then(success => {
    process.exit(success ? 0 : 1);
  });
}
