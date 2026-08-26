import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import Tool Handlers
import {
  analyzeSerp,
  profileCompetitor,
  analyzeCompetitorContentGap,
  diffCompetitor,
  analyzeForumDiscussions
} from '../tools/serp.js';

import {
  auditGeoAiReadiness,
  generateLlmsTxt,
  auditAiBotsRobots
} from '../tools/geo.js';

import {
  scoreInformationGain,
  auditEeat
} from '../tools/eeat.js';

import {
  auditOnPage,
  generateContentBrief,
  scoreReadability
} from '../tools/onpage.js';

import {
  auditTechnical,
  diffJsRendering,
  validateRobotsTxt,
  inspectSitemap,
  analyzeInternalLinks
} from '../tools/technical.js';

import {
  getKeywordSuggestions,
  findQuestions,
  clusterKeywords,
  classifySearchIntent
} from '../tools/keywords.js';

import {
  mapEntitySalience,
  generateSchemaMarkup,
  validateSchema
} from '../tools/schema.js';

import {
  auditPageSpeed,
  submitIndexNow,
  auditContentDecay
} from '../tools/performance.js';

import {
  auditProject,
  diagnoseSeo,
  prioritizeFindings,
  generateFixPlan,
  createSnapshotTool,
  compareSnapshotsTool,
  checkRegression
} from '../tools/orchestration.js';

export const TOOLS: Tool[] = [
  // ==========================================
  // Layer 0. Agent Orchestration & Remediation
  // ==========================================
  {
    name: 'seo_project_audit',
    description: 'Flagship project audit: scans codebase for framework (Next.js, Astro, Vite, Remix, SvelteKit), maps discovered routes to source files, builds crawl graph, and computes multidimensional SEO scores (Technical, Content, AI Readiness, Discoverability, Entity).',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute or relative path to project workspace root' },
        base_url: { type: 'string', description: 'Optional live or dev server URL (e.g. "http://localhost:3000")' },
        crawl_depth: { type: 'number', description: 'Crawl depth for internal link graph analysis (default 2)' }
      },
      required: ['project_path']
    }
  },
  {
    name: 'seo_diagnose',
    description: 'Deep root-cause diagnostic: correlates an observed SEO issue or URL back to specific source code files, components, and line numbers with actionable code fix blueprints.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Path to project workspace root' },
        target_url_or_file: { type: 'string', description: 'URL, route path (e.g. "/blog/[slug]"), or file path to diagnose' },
        focus_issue_id: { type: 'string', description: 'Optional specific finding ID (e.g. "SEO-CANONICAL-001")' }
      },
      required: ['project_path', 'target_url_or_file']
    }
  },
  {
    name: 'seo_prioritize',
    description: 'Ranks and organizes SEO findings into actionable sprints (Quick Wins, Critical Blockers, Architectural Improvements) using (Impact × Confidence × Reach) / Effort formula.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Path to project workspace root (or provide raw findings array)' },
        max_count: { type: 'number', description: 'Max items per sprint category (default 20)' }
      },
      required: ['project_path']
    }
  },
  {
    name: 'seo_fix_plan',
    description: 'Generates an end-to-end, multi-step code modification and verification plan for AI coding agents to autonomously resolve detected SEO issues.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Path to project workspace root' },
        finding_ids: { type: 'array', items: { type: 'string' }, description: 'Optional list of specific finding IDs to target' }
      },
      required: ['project_path']
    }
  },
  {
    name: 'seo_snapshot_create',
    description: 'Creates and saves a structured project snapshot (schema seo.gravity/v1) containing all discovered routes, findings, crawl graph, and multidimensional scores.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Path to project workspace root' },
        base_url: { type: 'string', description: 'Optional live/dev server URL' },
        output_path: { type: 'string', description: 'Optional file path to save snapshot JSON (e.g. ".seo-snapshot.json")' }
      },
      required: ['project_path']
    }
  },
  {
    name: 'seo_snapshot_compare',
    description: 'Compares a baseline snapshot against a current snapshot to identify resolved issues, new regressions, and overall SEO score deltas.',
    inputSchema: {
      type: 'object',
      properties: {
        baseline_snapshot: { type: 'string', description: 'Baseline snapshot file path or serialized JSON string' },
        current_snapshot: { type: 'string', description: 'Current snapshot file path or serialized JSON string' }
      },
      required: ['baseline_snapshot', 'current_snapshot']
    }
  },
  {
    name: 'seo_regression_check',
    description: 'Verifies that recent code modifications did not introduce any new critical SEO regressions compared to a baseline snapshot. Perfect for CI/CD gates.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Path to project workspace root' },
        baseline_snapshot: { type: 'string', description: 'Baseline snapshot file path or serialized JSON string' },
        base_url: { type: 'string', description: 'Optional live/dev server URL' }
      },
      required: ['project_path', 'baseline_snapshot']
    }
  },

  // ==========================================
  // Layer 1. SERP & Competitor Intelligence
  // ==========================================
  {
    name: 'seo_serp_analyze',
    description: 'Extracts real-time Google SERP organic rankings, People Also Ask (PAA) questions, Related Searches, and intent distribution.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term to analyze' },
        country: { type: 'string', description: 'Country code (e.g. "us", "uk", "in") (default "us")' },
        language: { type: 'string', description: 'Language code (e.g. "en", "es") (default "en")' },
        num_results: { type: 'number', description: 'Number of results to fetch (default 10)' }
      },
      required: ['query']
    }
  },
  {
    name: 'seo_competitor_content_gap',
    description: 'Discovers high-priority content gaps and missing subtopics by comparing target content against top-ranking SERP competitor pages.',
    inputSchema: {
      type: 'object',
      properties: {
        target_url_or_text: { type: 'string', description: 'Your page URL or drafted markdown/HTML content' },
        target_keyword: { type: 'string', description: 'Primary keyword to rank for' },
        competitor_urls: { type: 'array', items: { type: 'string' }, description: 'List of top-ranking competitor URLs (1-5 URLs)' }
      },
      required: ['target_url_or_text', 'target_keyword']
    }
  },
  {
    name: 'seo_competitor_profile',
    description: 'Performs comprehensive on-page technical, content, and schema profiling of a single competitor URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Competitor URL to inspect' }
      },
      required: ['url']
    }
  },
  {
    name: 'seo_competitor_diff',
    description: 'Direct side-by-side technical & content comparison between your page and a competitor page.',
    inputSchema: {
      type: 'object',
      properties: {
        my_url: { type: 'string', description: 'Your page URL or local dev URL' },
        competitor_url: { type: 'string', description: 'Competitor page URL' },
        focus_keyword: { type: 'string', description: 'Target search query' }
      },
      required: ['my_url', 'competitor_url']
    }
  },
  {
    name: 'seo_forum_discussions_pulse',
    description: 'Mines real-user discussions, pain points, and terminology from Reddit and developer forums.',
    inputSchema: {
      type: 'object',
      properties: {
        topic_or_keyword: { type: 'string', description: 'Topic, niche, or keyword to research' }
      },
      required: ['topic_or_keyword']
    }
  },

  // ==========================================
  // Layer 2. Generative Engine Optimization (GEO & AI Search)
  // ==========================================
  {
    name: 'seo_geo_ai_readiness_audit',
    description: 'Audits content for Generative Engine Optimization (GEO): checks direct answerability, extractability, structured entity definitions, and table formats for ChatGPT, Perplexity, and Google AI Overviews.',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_text: { type: 'string', description: 'Page URL or raw content to audit' },
        target_query: { type: 'string', description: 'Primary search query the user might ask an AI' }
      },
      required: ['url_or_text']
    }
  },
  {
    name: 'seo_llms_txt_generate',
    description: 'Generates a standard-compliant /llms.txt and /llms-full.txt file for AI agent documentation discovery.',
    inputSchema: {
      type: 'object',
      properties: {
        site_name: { type: 'string', description: 'Brand or product name' },
        site_description: { type: 'string', description: 'Short summary of the site and offering' },
        key_pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['title', 'url']
          },
          description: 'Key pages, documentation, or product URLs'
        }
      },
      required: ['site_name', 'site_description', 'key_pages']
    }
  },
  {
    name: 'seo_ai_bots_robots_audit',
    description: 'Audits robots.txt to verify access permissions for AI search crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot).',
    inputSchema: {
      type: 'object',
      properties: {
        domain_or_url: { type: 'string', description: 'Target domain or URL (e.g. "example.com")' }
      },
      required: ['domain_or_url']
    }
  },

  // ==========================================
  // Layer 3. Information Gain & E-E-A-T
  // ==========================================
  {
    name: 'seo_information_gain_score',
    description: 'Measures Information Gain: evaluates unique insights, proprietary data points, novel methodologies, and counter-intuitive findings.',
    inputSchema: {
      type: 'object',
      properties: {
        my_content_or_url: { type: 'string', description: 'Your content draft or live URL' },
        keyword: { type: 'string', description: 'Primary topic or keyword' }
      },
      required: ['my_content_or_url', 'keyword']
    }
  },
  {
    name: 'seo_eeat_audit',
    description: 'Audits Experience, Expertise, Authoritativeness, and Trustworthiness (E-E-A-T) signals.',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_html: { type: 'string', description: 'Page URL or raw HTML' }
      },
      required: ['url_or_html']
    }
  },

  // ==========================================
  // Layer 4. Content & On-Page SEO
  // ==========================================
  {
    name: 'seo_onpage_audit',
    description: 'Complete on-page SEO analyzer: checks Title tag, Meta Description, Heading hierarchy, Keyword density, Canonical URLs, and OpenGraph/Twitter social meta tags.',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_html: { type: 'string', description: 'Live URL or raw HTML string' },
        focus_keyword: { type: 'string', description: 'Optional target focus keyword' }
      },
      required: ['url_or_html']
    }
  },
  {
    name: 'seo_content_brief_generate',
    description: 'Generates a comprehensive SEO content brief with optimal word count, H2/H3 outline, required semantic entities, and search intent guidelines.',
    inputSchema: {
      type: 'object',
      properties: {
        primary_keyword: { type: 'string', description: 'Target primary keyword' },
        secondary_keywords: { type: 'array', items: { type: 'string' }, description: 'List of supporting keywords' },
        search_intent: { type: 'string', enum: ['Informational', 'Transactional', 'Commercial', 'Navigational'], description: 'Target intent' }
      },
      required: ['primary_keyword']
    }
  },
  {
    name: 'seo_readability_score',
    description: 'Calculates Flesch Reading Ease and Flesch-Kincaid Grade Level with actionable tips to simplify complex sentences.',
    inputSchema: {
      type: 'object',
      properties: {
        text_or_url: { type: 'string', description: 'Draft text or live page URL' }
      },
      required: ['text_or_url']
    }
  },

  // ==========================================
  // Layer 5. Technical SEO & Crawlability
  // ==========================================
  {
    name: 'seo_technical_audit',
    description: 'Performs technical SEO inspection: HTTP status, Canonical consistency, Meta Robots (noindex/nofollow), Hreflang, Mixed Content, and Security headers.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Page URL to audit' }
      },
      required: ['url']
    }
  },
  {
    name: 'seo_js_rendering_diff',
    description: 'Compares raw static HTML vs client-side JavaScript rendered DOM to detect hydration mismatches and client-rendered links.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Page URL to test' }
      },
      required: ['url']
    }
  },
  {
    name: 'seo_robots_txt_validate',
    description: 'Tests if specific URLs or paths are crawlable by search engine bots (Googlebot, Bingbot, GPTBot) based on robots.txt rules.',
    inputSchema: {
      type: 'object',
      properties: {
        domain_or_url: { type: 'string', description: 'Website domain or URL' },
        test_path: { type: 'string', description: 'Subpath to test (default "/")' },
        user_agent: { type: 'string', description: 'Bot name to test (default "Googlebot")' }
      },
      required: ['domain_or_url']
    }
  },
  {
    name: 'seo_sitemap_inspect',
    description: 'Parses and validates XML sitemaps or sitemap index files, verifies lastmod tags, and checks URL limits.',
    inputSchema: {
      type: 'object',
      properties: {
        sitemap_url: { type: 'string', description: 'URL of sitemap.xml or sitemap_index.xml' }
      },
      required: ['sitemap_url']
    }
  },
  {
    name: 'seo_internal_links_analyze',
    description: 'Analyzes internal links, anchor text distribution, generic anchor alerts, and nofollow internal flags.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Page URL to analyze' }
      },
      required: ['url']
    }
  },

  // ==========================================
  // Layer 6. Keyword Research & Intent
  // ==========================================
  {
    name: 'seo_keyword_suggestions',
    description: 'Extracts keyword suggestions and long-tail variations using Google Autocomplete and the Alphabet Soup method.',
    inputSchema: {
      type: 'object',
      properties: {
        seed_keyword: { type: 'string', description: 'Seed keyword' },
        include_alphabet_soup: { type: 'boolean', description: 'Generate a-z suggestions (default true)' }
      },
      required: ['seed_keyword']
    }
  },
  {
    name: 'seo_questions_find',
    description: 'Finds question queries asked by users across Google (Who, What, Where, When, Why, How, Can, Is).',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic or keyword' }
      },
      required: ['topic']
    }
  },
  {
    name: 'seo_keyword_cluster',
    description: 'Clusters a list of keywords into distinct Topic Pillars and Supporting Articles using semantic similarity.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: 'List of keywords to cluster' },
        similarity_threshold: { type: 'number', description: 'Clustering similarity threshold (0.1 to 0.9, default 0.4)' }
      },
      required: ['keywords']
    }
  },
  {
    name: 'seo_search_intent_classify',
    description: 'Classifies search intent (Informational, Transactional, Commercial, Navigational) for a batch of keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: 'Array of keywords to classify' }
      },
      required: ['keywords']
    }
  },

  // ==========================================
  // Layer 7. Schema Markup & Structured Data
  // ==========================================
  {
    name: 'seo_entity_salience_map',
    description: 'Extracts core entities, computes salience scores, and extracts Subject-Predicate-Object (SPO) relationship triples.',
    inputSchema: {
      type: 'object',
      properties: {
        text_or_url: { type: 'string', description: 'Page URL, raw HTML, or text' }
      },
      required: ['text_or_url']
    }
  },
  {
    name: 'seo_schema_generate',
    description: 'Generates validated Schema.org JSON-LD scripts (Article, FAQPage, Product, LocalBusiness, BreadcrumbList, Organization).',
    inputSchema: {
      type: 'object',
      properties: {
        schema_type: {
          type: 'string',
          enum: ['Article', 'FAQPage', 'Product', 'HowTo', 'LocalBusiness', 'Organization', 'BreadcrumbList', 'SoftwareApplication'],
          description: 'Type of schema to generate'
        },
        data: { type: 'object', description: 'Schema properties payload' }
      },
      required: ['schema_type', 'data']
    }
  },
  {
    name: 'seo_schema_validate',
    description: 'Validates on-page or pasted JSON-LD structured data against Schema.org and Google Rich Result requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_jsonld: { type: 'string', description: 'Page URL or raw JSON-LD string' }
      },
      required: ['url_or_jsonld']
    }
  },

  // ==========================================
  // Layer 8. Performance & Maintenance
  // ==========================================
  {
    name: 'seo_pagespeed_audit',
    description: 'Checks Core Web Vitals (LCP, FCP, CLS, TTFB) with performance optimization fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Page URL to test' },
        strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Device strategy (default "mobile")' }
      },
      required: ['url']
    }
  },
  {
    name: 'seo_indexnow_submit',
    description: 'Submits newly created or updated URLs directly to Bing & Yandex via the IndexNow API protocol.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Website domain host (e.g. "example.com")' },
        key: { type: 'string', description: 'IndexNow API key' },
        key_location: { type: 'string', description: 'URL location of the key file' },
        url_list: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to submit' }
      },
      required: ['host', 'key', 'key_location', 'url_list']
    }
  },
  {
    name: 'seo_content_decay_audit',
    description: 'Scans content for freshness decay (stale year references e.g. "2020", outdated statistics, broken external links).',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_text: { type: 'string', description: 'Page URL or draft text to audit' }
      },
      required: ['url_or_text']
    }
  }
];

export async function executeTool(name: string, a: Record<string, any>): Promise<any> {
  switch (name) {
    // 0. Agent Orchestration & Remediation
    case 'seo_project_audit':
      return auditProject(a.project_path, a.base_url, a.crawl_depth);
    case 'seo_diagnose':
      return diagnoseSeo(a.project_path, a.target_url_or_file, a.focus_issue_id);
    case 'seo_prioritize':
      return prioritizeFindings(a.project_path, a.max_count);
    case 'seo_fix_plan':
      return generateFixPlan(a.project_path, a.finding_ids);
    case 'seo_snapshot_create':
      return createSnapshotTool(a.project_path, a.base_url, a.output_path);
    case 'seo_snapshot_compare':
      return compareSnapshotsTool(a.baseline_snapshot, a.current_snapshot);
    case 'seo_regression_check':
      return checkRegression(a.project_path, a.baseline_snapshot, a.base_url);

    // 1. SERP & Competitors
    case 'seo_serp_analyze':
      return analyzeSerp(a.query, a.country, a.language, a.num_results);
    case 'seo_competitor_content_gap':
      return analyzeCompetitorContentGap(a.target_url_or_text, a.target_keyword, a.competitor_urls);
    case 'seo_competitor_profile':
      return profileCompetitor(a.url);
    case 'seo_competitor_diff':
      return diffCompetitor(a.my_url, a.competitor_url, a.focus_keyword);
    case 'seo_forum_discussions_pulse':
      return analyzeForumDiscussions(a.topic_or_keyword);

    // 2. GEO & AI Search
    case 'seo_geo_ai_readiness_audit':
      return auditGeoAiReadiness(a.url_or_text, a.target_query);
    case 'seo_llms_txt_generate':
      return generateLlmsTxt(a.site_name, a.site_description, a.key_pages);
    case 'seo_ai_bots_robots_audit':
      return auditAiBotsRobots(a.domain_or_url);

    // 3. E-E-A-T & Info Gain
    case 'seo_information_gain_score':
      return scoreInformationGain(a.my_content_or_url, a.keyword);
    case 'seo_eeat_audit':
      return auditEeat(a.url_or_html);

    // 4. On-Page
    case 'seo_onpage_audit':
      return auditOnPage(a.url_or_html, a.focus_keyword);
    case 'seo_content_brief_generate':
      return generateContentBrief(a.primary_keyword, a.secondary_keywords, a.search_intent);
    case 'seo_readability_score':
      return scoreReadability(a.text_or_url);

    // 5. Technical
    case 'seo_technical_audit':
      return auditTechnical(a.url);
    case 'seo_js_rendering_diff':
      return diffJsRendering(a.url);
    case 'seo_robots_txt_validate':
      return validateRobotsTxt(a.domain_or_url, a.test_path, a.user_agent);
    case 'seo_sitemap_inspect':
      return inspectSitemap(a.sitemap_url);
    case 'seo_internal_links_analyze':
      return analyzeInternalLinks(a.url);

    // 6. Keywords
    case 'seo_keyword_suggestions':
      return getKeywordSuggestions(a.seed_keyword, a.include_alphabet_soup);
    case 'seo_questions_find':
      return findQuestions(a.topic);
    case 'seo_keyword_cluster':
      return clusterKeywords(a.keywords, a.similarity_threshold);
    case 'seo_search_intent_classify':
      return classifySearchIntent(a.keywords);

    // 7. Schema
    case 'seo_entity_salience_map':
      return mapEntitySalience(a.text_or_url);
    case 'seo_schema_generate':
      return generateSchemaMarkup(a.schema_type, a.data);
    case 'seo_schema_validate':
      return validateSchema(a.url_or_jsonld);

    // 8. Performance & Maintenance
    case 'seo_pagespeed_audit':
      return auditPageSpeed(a.url, a.strategy);
    case 'seo_indexnow_submit':
      return submitIndexNow(a.host, a.key, a.key_location, a.url_list);
    case 'seo_content_decay_audit':
      return auditContentDecay(a.url_or_text);

    default:
      throw new Error(`Unknown SEO Gravity MCP tool: ${name}`);
  }
}
