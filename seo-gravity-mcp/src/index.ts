#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

// Import Tool Handlers
import {
  analyzeSerp,
  profileCompetitor,
  analyzeCompetitorContentGap,
  diffCompetitor,
  analyzeForumDiscussions
} from './tools/serp.js';

import {
  auditGeoAiReadiness,
  generateLlmsTxt,
  auditAiBotsRobots
} from './tools/geo.js';

import {
  scoreInformationGain,
  auditEeat
} from './tools/eeat.js';

import {
  auditOnPage,
  generateContentBrief,
  scoreReadability
} from './tools/onpage.js';

import {
  auditTechnical,
  diffJsRendering,
  validateRobotsTxt,
  inspectSitemap,
  analyzeInternalLinks
} from './tools/technical.js';

import {
  getKeywordSuggestions,
  findQuestions,
  clusterKeywords,
  classifySearchIntent
} from './tools/keywords.js';

import {
  mapEntitySalience,
  generateSchemaMarkup,
  validateSchema
} from './tools/schema.js';

import {
  auditPageSpeed,
  submitIndexNow,
  auditContentDecay
} from './tools/performance.js';

// Define the 28 MCP Tools
const TOOLS: Tool[] = [
  // 1. SERP & Competitor Intelligence
  {
    name: 'seo_serp_analyze',
    description: 'Scrapes live Google SERP for any keyword. Returns top ranking URLs, snippets, People Also Ask (PAA), Related Searches, and rich SERP features.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword / phrase' },
        country: { type: 'string', description: 'Two-letter country code (default "us")' },
        language: { type: 'string', description: 'Language code (default "en")' },
        num_results: { type: 'number', description: 'Number of results to fetch (default 10)' }
      },
      required: ['query']
    }
  },
  {
    name: 'seo_competitor_content_gap',
    description: 'Compares your page URL or draft text against top 3-5 ranking competitor pages to identify missing TF-IDF semantic entities, heading subtopics, and content depth gaps.',
    inputSchema: {
      type: 'object',
      properties: {
        target_url_or_text: { type: 'string', description: 'Your page URL, local file path, or draft content' },
        target_keyword: { type: 'string', description: 'Target keyword to rank for' },
        competitor_urls: { type: 'array', items: { type: 'string' }, description: 'Optional list of competitor URLs (auto-scraped if omitted)' }
      },
      required: ['target_url_or_text', 'target_keyword']
    }
  },
  {
    name: 'seo_competitor_profile',
    description: 'Deep extraction of a single competitor URL: heading tree (H1-H4), schema types, word count, reading grade, meta tags, and internal/external link ratio.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Competitor page URL' }
      },
      required: ['url']
    }
  },
  {
    name: 'seo_competitor_diff',
    description: 'Side-by-side scorecard comparing your page vs a competitor across 25+ ranking signals (title, H1, keyword density, schema, image alt, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        my_url: { type: 'string', description: 'Your page URL or local server URL' },
        competitor_url: { type: 'string', description: 'Competitor URL' },
        focus_keyword: { type: 'string', description: 'Primary keyword to evaluate' }
      },
      required: ['my_url', 'competitor_url', 'focus_keyword']
    }
  },
  {
    name: 'seo_forum_discussions_pulse',
    description: 'Scrapes Reddit, Quora, and forum discussions currently ranking on Google for a topic. Extracts real user problems, sentiments, and consensus.',
    inputSchema: {
      type: 'object',
      properties: {
        topic_or_keyword: { type: 'string', description: 'Topic or keyword to query' }
      },
      required: ['topic_or_keyword']
    }
  },

  // 2. GEO & AI Search (AEO)
  {
    name: 'seo_geo_ai_readiness_audit',
    description: 'Evaluates content for citation readiness in Google AI Overviews, Perplexity.ai, and ChatGPT Search (checks direct definitions, semantic chunking, tables, and stats).',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_text: { type: 'string', description: 'Page URL, raw HTML, or text draft' },
        target_query: { type: 'string', description: 'Search query to test' }
      },
      required: ['url_or_text', 'target_query']
    }
  },
  {
    name: 'seo_llms_txt_generate',
    description: 'Generates standard /llms.txt and /llms-full.txt markdown files to provide clean, structured context for AI search bots.',
    inputSchema: {
      type: 'object',
      properties: {
        site_name: { type: 'string', description: 'Site or project name' },
        site_description: { type: 'string', description: 'Concise summary of site purpose' },
        key_pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['title', 'url', 'description']
          },
          description: 'Key pages to index for LLMs'
        }
      },
      required: ['site_name', 'site_description', 'key_pages']
    }
  },
  {
    name: 'seo_ai_bots_robots_audit',
    description: 'Audits robots.txt permissions specifically for generative AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider).',
    inputSchema: {
      type: 'object',
      properties: {
        domain_or_url: { type: 'string', description: 'Website domain or URL' }
      },
      required: ['domain_or_url']
    }
  },

  // 3. Information Gain & E-E-A-T
  {
    name: 'seo_information_gain_score',
    description: 'Quantifies content novelty vs top 10 Google results (Google Information Gain Patent) to detect and fix generic AI fluff.',
    inputSchema: {
      type: 'object',
      properties: {
        my_content_or_url: { type: 'string', description: 'Your content draft, local file, or live URL' },
        keyword: { type: 'string', description: 'Target search query' }
      },
      required: ['my_content_or_url', 'keyword']
    }
  },
  {
    name: 'seo_eeat_audit',
    description: 'Audits Google E-E-A-T trust signals (Person schema, author bylines, sameAs Wikidata/LinkedIn links, editorial policies, update dates).',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_html: { type: 'string', description: 'Page URL or raw HTML' }
      },
      required: ['url_or_html']
    }
  },

  // 4. On-Page & Content Strategy
  {
    name: 'seo_onpage_audit',
    description: 'Comprehensive on-page audit of a URL, local file, or raw HTML (title pixel width, meta CTR, heading hierarchy, image alt, and slug).',
    inputSchema: {
      type: 'object',
      properties: {
        url_or_html: { type: 'string', description: 'URL, local file path, or raw HTML string' },
        focus_keyword: { type: 'string', description: 'Optional primary keyword to verify' }
      },
      required: ['url_or_html']
    }
  },
  {
    name: 'seo_content_brief_generate',
    description: 'Generates a data-backed Content Outline & Brief with target word count, H1/H2/H3 structure, semantic entities, and PAA FAQs.',
    inputSchema: {
      type: 'object',
      properties: {
        primary_keyword: { type: 'string', description: 'Primary keyword to target' },
        secondary_keywords: { type: 'array', items: { type: 'string' }, description: 'Supporting secondary keywords' },
        search_intent: {
          type: 'string',
          enum: ['Informational', 'Transactional', 'Commercial Investigation', 'Navigational'],
          description: 'Optional intent classification'
        }
      },
      required: ['primary_keyword']
    }
  },
  {
    name: 'seo_readability_score',
    description: 'Computes Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog index, passive voice %, and complex sentence breakdowns.',
    inputSchema: {
      type: 'object',
      properties: {
        text_or_url: { type: 'string', description: 'Text, markdown, or URL to score' }
      },
      required: ['text_or_url']
    }
  },

  // 5. Technical SEO & JS Hydration
  {
    name: 'seo_technical_audit',
    description: 'Inspects HTTP status code, redirect chains, canonical consistency, meta robots (noindex/nofollow), hreflang, SSL, and OpenGraph tags.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to audit' }
      },
      required: ['url']
    }
  },
  {
    name: 'seo_js_rendering_diff',
    description: 'Compares raw server HTML response against the hydrated client DOM (JavaScript SEO) to spot hidden content or broken tags.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to diff (supports localhost or live sites)' }
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

  // 6. Keyword Research & Intent Clustering
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
        similarity_threshold: { type: 'number', description: 'Clustering sensitivity 0.1 - 1.0 (default 0.6)' }
      },
      required: ['keywords']
    }
  },
  {
    name: 'seo_search_intent_classify',
    description: 'Classifies keywords into Informational, Navigational, Commercial Investigation, or Transactional intent.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to classify' }
      },
      required: ['keywords']
    }
  },

  // 7. Schema & Entity Graph
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

  // 8. Performance, IndexNow & Maintenance
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

// Initialize Server
const server = new Server(
  {
    name: 'seo-gravity-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as Record<string, any>;

  try {
    let result: any;

    switch (name) {
      // 1. SERP & Competitors
      case 'seo_serp_analyze':
        result = await analyzeSerp(a.query, a.country, a.language, a.num_results);
        break;
      case 'seo_competitor_content_gap':
        result = await analyzeCompetitorContentGap(a.target_url_or_text, a.target_keyword, a.competitor_urls);
        break;
      case 'seo_competitor_profile':
        result = await profileCompetitor(a.url);
        break;
      case 'seo_competitor_diff':
        result = await diffCompetitor(a.my_url, a.competitor_url, a.focus_keyword);
        break;
      case 'seo_forum_discussions_pulse':
        result = await analyzeForumDiscussions(a.topic_or_keyword);
        break;

      // 2. GEO & AI Search
      case 'seo_geo_ai_readiness_audit':
        result = await auditGeoAiReadiness(a.url_or_text, a.target_query);
        break;
      case 'seo_llms_txt_generate':
        result = generateLlmsTxt(a.site_name, a.site_description, a.key_pages);
        break;
      case 'seo_ai_bots_robots_audit':
        result = await auditAiBotsRobots(a.domain_or_url);
        break;

      // 3. E-E-A-T & Info Gain
      case 'seo_information_gain_score':
        result = await scoreInformationGain(a.my_content_or_url, a.keyword);
        break;
      case 'seo_eeat_audit':
        result = await auditEeat(a.url_or_html);
        break;

      // 4. On-Page
      case 'seo_onpage_audit':
        result = await auditOnPage(a.url_or_html, a.focus_keyword);
        break;
      case 'seo_content_brief_generate':
        result = await generateContentBrief(a.primary_keyword, a.secondary_keywords, a.search_intent);
        break;
      case 'seo_readability_score':
        result = await scoreReadability(a.text_or_url);
        break;

      // 5. Technical
      case 'seo_technical_audit':
        result = await auditTechnical(a.url);
        break;
      case 'seo_js_rendering_diff':
        result = await diffJsRendering(a.url);
        break;
      case 'seo_robots_txt_validate':
        result = await validateRobotsTxt(a.domain_or_url, a.test_path, a.user_agent);
        break;
      case 'seo_sitemap_inspect':
        result = await inspectSitemap(a.sitemap_url);
        break;
      case 'seo_internal_links_analyze':
        result = await analyzeInternalLinks(a.url);
        break;

      // 6. Keywords
      case 'seo_keyword_suggestions':
        result = await getKeywordSuggestions(a.seed_keyword, a.include_alphabet_soup);
        break;
      case 'seo_questions_find':
        result = await findQuestions(a.topic);
        break;
      case 'seo_keyword_cluster':
        result = clusterKeywords(a.keywords, a.similarity_threshold);
        break;
      case 'seo_search_intent_classify':
        result = classifySearchIntent(a.keywords);
        break;

      // 7. Schema
      case 'seo_entity_salience_map':
        result = await mapEntitySalience(a.text_or_url);
        break;
      case 'seo_schema_generate':
        result = generateSchemaMarkup(a.schema_type, a.data);
        break;
      case 'seo_schema_validate':
        result = await validateSchema(a.url_or_jsonld);
        break;

      // 8. Performance & Maintenance
      case 'seo_pagespeed_audit':
        result = await auditPageSpeed(a.url, a.strategy);
        break;
      case 'seo_indexnow_submit':
        result = await submitIndexNow(a.host, a.key, a.key_location, a.url_list);
        break;
      case 'seo_content_decay_audit':
        result = await auditContentDecay(a.url_or_text);
        break;

      default:
        throw new Error(`Unknown SEO Gravity MCP tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `SEO Gravity Tool Execution Error (${name}): ${error.message}`
        }
      ]
    };
  }
});

// Start the Server using Stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SEO Gravity MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting SEO Gravity MCP Server:', err);
  process.exit(1);
});
