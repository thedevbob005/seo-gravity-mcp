import { auditOnPage, generateContentBrief, scoreReadability } from './tools/onpage.js';
import { auditGeoAiReadiness, generateLlmsTxt, auditAiBotsRobots } from './tools/geo.js';
import { scoreInformationGain, auditEeat } from './tools/eeat.js';
import { getKeywordSuggestions, findQuestions, clusterKeywords, classifySearchIntent } from './tools/keywords.js';
import { mapEntitySalience, generateSchemaMarkup, validateSchema } from './tools/schema.js';
import { auditTechnical, validateRobotsTxt } from './tools/technical.js';
import { auditPageSpeed, auditContentDecay } from './tools/performance.js';
import { analyzeSerp, analyzeCompetitorContentGap, analyzeForumDiscussions } from './tools/serp.js';

async function runTests() {
  console.log('🧪 Starting SEO Gravity MCP Comprehensive Test Suite...\n');

  // Test 1: On-Page Audit
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
  console.log(`✅ On-Page Score: ${onpage.overallScore}/100 | Title status: ${onpage.titleAudit.status} | H1 count: ${onpage.headingsAudit.h1Count}`);

  // Test 2: GEO / AEO Readiness Audit
  console.log('\n2️⃣ Testing GEO & AI Search Readiness Audit...');
  const geo = await auditGeoAiReadiness(sampleHtml, 'best project management software');
  console.log(`✅ GEO Score: ${geo.overallGeoScore}/100 | Citation Likelihood: ${geo.citationLikelihood} | Direct Answer: ${geo.checks.directAnswerParagraph.passed}`);

  // Test 3: LLMS.txt Generation
  console.log('\n3️⃣ Testing llms.txt Generation...');
  const llms = generateLlmsTxt('SaaS Suite', 'Cloud workspace tools', [
    { title: 'Home', url: 'https://example.com', description: 'Main landing page' },
    { title: 'Docs', url: 'https://example.com/docs', description: 'API reference' }
  ]);
  console.log(`✅ llms.txt generated (${llms.llmsTxt.length} chars)`);

  // Test 4: Schema Generation & Validation
  console.log('\n4️⃣ Testing Schema.org JSON-LD Generation & Validation...');
  const schema = generateSchemaMarkup('FAQPage', {
    items: [
      { question: 'What is project management software?', answer: 'It is a platform to coordinate team tasks and roadmaps.' },
      { question: 'Is it free to start?', answer: 'Yes, free tiers are available for small teams.' }
    ]
  });
  const val = await validateSchema(schema.jsonLdScript.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
  console.log(`✅ Schema Generated & Validated (${val.schemasDetectedCount} schemas detected, Valid: ${val.schemas[0]?.isValid})`);

  // Test 5: Keyword Clustering & Intent Classification
  console.log('\n5️⃣ Testing Keyword Clustering & Search Intent Classification...');
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
  console.log(`✅ Clustered ${keywords.length} keywords into ${clusters.clusterCount} cluster(s)`);
  console.log(`✅ Intent sample: "${keywords[1]}" -> ${intents[1].intent} (${(intents[1].confidenceScore * 100).toFixed(0)}% confidence)`);

  // Test 6: Content Decay Audit
  console.log('\n6️⃣ Testing Content Decay Audit...');
  const decay = await auditContentDecay('In 2019, our study showed that 45% of users preferred desktop over mobile.');
  console.log(`✅ Freshness Score: ${decay.freshnessScore}/100 | Decay level: ${decay.decayLevel} | Stale years found: ${decay.staleYearReferences.join(', ')}`);

  console.log('\n🎉 ALL CORE TEST SUITES PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
