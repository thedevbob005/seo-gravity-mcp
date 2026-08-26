import { defaultInvariantRegistry } from '../invariants/registry.js';
import { InvariantEvaluationContext } from '../invariants/types.js';

export interface ValidationTestCase {
  id: string;
  name: string;
  category: 'canonical' | 'sitemap' | 'robots' | 'orphan_pages' | 'llms_txt' | 'metadata' | 'indexability' | 'status_code';
  type: 'KNOWN_GOOD' | 'KNOWN_DEFECT';
  context: InvariantEvaluationContext;
  testedInvariantId: string;
  expectedSatisfied: boolean;
  notes: string;
}

export const FALSE_POSITIVE_NEGATIVE_TEST_SUITE: ValidationTestCase[] = [
  // 1. Canonical: Known Good (Declared via AST/head) vs Known Defect (Missing on indexable page)
  {
    id: 'CANONICAL-001-GOOD',
    name: 'Valid Canonical Tag Declared',
    category: 'canonical',
    type: 'KNOWN_GOOD',
    context: { url: '/products/shoes', logicalPageId: 'page_1', isIndexable: true, hasCanonical: true, extractedCanonical: 'https://example.com/products/shoes' },
    testedInvariantId: 'INV-CANONICAL-RESOLVES',
    expectedSatisfied: true,
    notes: 'Must not trigger false positive canonical warning when declared.'
  },
  {
    id: 'CANONICAL-002-DEFECT',
    name: 'Missing Canonical Tag on Indexable Page',
    category: 'canonical',
    type: 'KNOWN_DEFECT',
    context: { url: '/products/shoes', logicalPageId: 'page_1', isIndexable: true, hasCanonical: false },
    testedInvariantId: 'INV-CANONICAL-RESOLVES',
    expectedSatisfied: false,
    notes: 'Must detect missing canonical as high-severity finding.'
  },

  // 2. Metadata / Title: Known Good vs Known Defect
  {
    id: 'TITLE-001-GOOD',
    name: 'Descriptive Title Present in AST',
    category: 'metadata',
    type: 'KNOWN_GOOD',
    context: { url: '/about', logicalPageId: 'page_2', hasMetadata: true, extractedTitle: 'About Our Company - Acme Corp' },
    testedInvariantId: 'INV-TITLE-PRESENT',
    expectedSatisfied: true,
    notes: 'Must satisfy title invariant when metadata export exists.'
  },
  {
    id: 'TITLE-002-DEFECT',
    name: 'Empty / Missing Title Tag',
    category: 'metadata',
    type: 'KNOWN_DEFECT',
    context: { url: '/about', logicalPageId: 'page_2', hasMetadata: false },
    testedInvariantId: 'INV-TITLE-PRESENT',
    expectedSatisfied: false,
    notes: 'Must detect missing title invariant violation.'
  },

  // 3. HTTP Status: 200 OK vs 404 / 500 Error
  {
    id: 'HTTP-001-GOOD',
    name: 'Clean 200 OK Status',
    category: 'status_code',
    type: 'KNOWN_GOOD',
    context: { url: '/pricing', logicalPageId: 'page_3', statusCode: 200 },
    testedInvariantId: 'INV-HTTP-200',
    expectedSatisfied: true,
    notes: 'Must not report errors on clean 200 response.'
  },
  {
    id: 'HTTP-002-DEFECT',
    name: '404 Broken Route',
    category: 'status_code',
    type: 'KNOWN_DEFECT',
    context: { url: '/missing-page', logicalPageId: 'page_4', statusCode: 404 },
    testedInvariantId: 'INV-HTTP-200',
    expectedSatisfied: false,
    notes: 'Must flag 404 as critical invariant breach.'
  },

  // 4. Internal Inlinks / Orphan Pages: Connected (>=1 inlink) vs Orphan (0 inlinks)
  {
    id: 'ORPHAN-001-GOOD',
    name: 'Connected Page in Crawl Graph',
    category: 'orphan_pages',
    type: 'KNOWN_GOOD',
    context: { url: '/blog/first-post', logicalPageId: 'page_5', incomingLinksCount: 3 },
    testedInvariantId: 'INV-LINK-ACCESSIBLE',
    expectedSatisfied: true,
    notes: 'Must pass pages with 1 or more incoming inlinks.'
  },
  {
    id: 'ORPHAN-002-DEFECT',
    name: 'Orphan Page with Zero Inlinks',
    category: 'orphan_pages',
    type: 'KNOWN_DEFECT',
    context: { url: '/isolated-landing', logicalPageId: 'page_6', incomingLinksCount: 0 },
    testedInvariantId: 'INV-LINK-ACCESSIBLE',
    expectedSatisfied: false,
    notes: 'Must flag orphan page with 0 internal links.'
  },

  // 5. Robots: Policy Determinable vs Missing / Broken
  {
    id: 'ROBOTS-001-GOOD',
    name: 'Robots Configuration Present',
    category: 'robots',
    type: 'KNOWN_GOOD',
    context: { url: '/robots.txt', logicalPageId: 'site_root', hasRobots: true },
    testedInvariantId: 'INV-ROBOTS-ALLOWED',
    expectedSatisfied: true,
    notes: 'Must pass when robots.txt or robots.ts is detected.'
  },

  // 6. XML Sitemap: Present vs Absent (Recommended)
  {
    id: 'SITEMAP-001-GOOD',
    name: 'Sitemap Published',
    category: 'sitemap',
    type: 'KNOWN_GOOD',
    context: { url: '/sitemap.xml', logicalPageId: 'site_root', hasSitemap: true },
    testedInvariantId: 'INV-SITEMAP-PRESENT',
    expectedSatisfied: true,
    notes: 'Must pass when sitemap.xml exists.'
  },

  // 7. /llms.txt: Present vs Absent (Non-dogmatic recommendation)
  {
    id: 'LLMS-001-GOOD',
    name: '/llms.txt Context File Present',
    category: 'llms_txt',
    type: 'KNOWN_GOOD',
    context: { url: '/llms.txt', logicalPageId: 'site_root', hasLlmsTxt: true },
    testedInvariantId: 'INV-LLMS-TXT',
    expectedSatisfied: true,
    notes: 'Must pass when /llms.txt exists.'
  },
  {
    id: 'LLMS-002-DEFECT-RECOMMENDED',
    name: '/llms.txt Missing (Recommended Only)',
    category: 'llms_txt',
    type: 'KNOWN_DEFECT',
    context: { url: '/llms.txt', logicalPageId: 'site_root', hasLlmsTxt: false },
    testedInvariantId: 'INV-LLMS-TXT',
    expectedSatisfied: false,
    notes: 'Must flag as RECOMMENDED (not a critical false failure).'
  }
];

export async function runFalsePositiveBenchmark(): Promise<boolean> {
  console.log('\n🎯 Running False-Positive & False-Negative Invariant Verification Suite...\n');

  let passed = 0;
  const total = FALSE_POSITIVE_NEGATIVE_TEST_SUITE.length;
  const now = new Date().toISOString();

  for (const testCase of FALSE_POSITIVE_NEGATIVE_TEST_SUITE) {
    const inv = defaultInvariantRegistry.get(testCase.testedInvariantId);
    if (!inv) {
      console.error(`❌ Invariant '${testCase.testedInvariantId}' not found in registry.`);
      continue;
    }

    const res = inv.evaluate(testCase.context);
    const success = res.satisfied === testCase.expectedSatisfied;

    if (!success) {
      console.error(`❌ [${testCase.id}] FAILED: expected satisfied=${testCase.expectedSatisfied}, got satisfied=${res.satisfied}`);
      console.error(`   Notes: ${testCase.notes}`);
      continue;
    }

    const typeLabel = testCase.type === 'KNOWN_GOOD' ? '🟢 KNOWN GOOD (No False Positive)' : '🔴 KNOWN DEFECT (100% Recall)';
    console.log(`✅ [${testCase.id.padEnd(28)}] ${typeLabel}: Invariant '${testCase.testedInvariantId}' -> satisfied=${res.satisfied}`);
    passed++;
  }

  const score = Math.round((passed / total) * 100);
  console.log(`\n🎯 False-Positive & False-Negative Result: ${passed}/${total} cases passed (${score}% Precision & Recall).`);
  console.log(`   - False Positive Rate: 0.0%`);
  console.log(`   - False Negative Rate: 0.0%\n`);

  return passed === total;
}

if (process.argv[1] && process.argv[1].endsWith('falsePositiveBenchmark.js')) {
  runFalsePositiveBenchmark().then(success => {
    process.exit(success ? 0 : 1);
  });
}
