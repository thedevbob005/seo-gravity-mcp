# 🚀 SEO Gravity MCP (v1.0.2)

<div align="center">

[![npm version](https://img.shields.io/npm/v/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
[![npm downloads](https://img.shields.io/npm/dm/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue?style=for-the-badge&logo=anthropic)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Zero API Cost](https://img.shields.io/badge/Zero_API_Cost-100%25_Free-orange?style=for-the-badge)

**The Universal SEO Intelligence, Source-Code Correlation & Remediation Engine for AI Coding Agents.**

[⚡ Instant Start](#-instant-start) • [🤖 Client Setup](#-ai-ide--mcp-client-setup) • [🧠 5-Stage Autonomous Loop](#-the-5-stage-autonomous-remediation-loop) • [🛠 Tool Catalog (35 Tools)](#-complete-tool-catalog-35-tools) • [📄 License](#-license)

</div>

---

## 🌟 What is SEO Gravity?

**SEO Gravity** gives AI coding agents (Antigravity, Cursor, Claude Code, Windsurf, Cline, Roo Code, etc.) the autonomous ability to **understand, audit, fix, and continuously verify the SEO of the websites they build.**

Instead of acting as a passive "SEO metrics dump", SEO Gravity connects **rendered web signals** directly to your **source code components** (Next.js App Router, Astro, Vite/React, Remix, SvelteKit), ranks issues by impact-to-effort priority, generates code fix blueprints, and verifies that commits introduce **zero regressions**.

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │ 1. DISCOVER  │ ──▶ │  2. OBSERVE  │ ──▶ │ 3. DIAGNOSE  │ ──▶ │    4. FIX    │ ──▶ │  5. VERIFY   │
 │ Framework    │     │ Live/Dev SSR │     │ Root Causes  │     │ AI Modifies  │     │ Re-crawl &   │
 │ Routes       │     │ SERP & Comp. │     │ Prioritized  │     │ Source Code  │     │ Regression   │
 │ Source Map   │     │ Crawl Graph  │     │ Action Plan  │     │ Components   │     │ Diff Check   │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 💡 Key Architectural Pillars

1. **Source-to-URL Correlation**: Directly maps audited URLs (`/blog/my-post`) to source files (`app/blog/[slug]/page.tsx`), identifying missing metadata exports or canonical tags.
2. **Canonical Finding Model**: Every audit issue produces a normalized finding with `id`, `severity`, `confidence` ($0.0-1.0$), `evidenceType` (*Observed*, *Derived*, *Heuristic*, *Predictive*), `effort`, `priorityScore`, and verification steps.
3. **Crawl Graph & Site Architecture**: Computes BFS click depths, orphan pages, hub pages, circular link loops, and internal link equity (PageRank heuristic).
4. **Multidimensional Health Scoring**: Breaks scores into 7 discrete dimensions (Technical, Content, Discoverability, Authority, Entity, Performance, AI Readiness) with confidence levels.
5. **SEO Regression & Snapshot System**: Creates snapshots (`seo.gravity/v1`) before commits/PRs and validates that changes introduced 0 regressions.
6. **Zero Paid API Requirement**: 100% functional out-of-the-box using local AST parsing, cheerio, JSDOM, Google Autocomplete, and standard web extraction.

---

## ⚡ Instant Start

Run instantly with `npx`:

```bash
npx -y seo-gravity-mcp
```

Or install globally:

```bash
npm install -g seo-gravity-mcp
```

---

## 🤖 AI IDE & MCP Client Setup

### 1. 🟣 Claude Desktop
Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seo-gravity": {
      "command": "npx",
      "args": ["-y", "seo-gravity-mcp"]
    }
  }
}
```

### 2. ⚡ Cursor
Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "seo-gravity": {
      "command": "npx",
      "args": ["-y", "seo-gravity-mcp"]
    }
  }
}
```

### 3. 🌊 Antigravity / Windsurf / VS Code Cline
Add to `mcp_config.json`:

```json
{
  "mcpServers": {
    "seo-gravity": {
      "command": "npx",
      "args": ["-y", "seo-gravity-mcp"]
    }
  }
}
```

---

## 🛠 Complete Tool Catalog (35 Tools)

### Layer 0: Agent Orchestration & Remediation (Flagship)
| Tool Name | Operational Class | Description |
| :--- | :--- | :--- |
| `seo_project_audit` | **Planning / Audit** | Scans workspace framework, discovers routes, correlates source files, builds crawl graph, and computes multidimensional SEO health. |
| `seo_diagnose` | **Planning / Diagnose** | Deep root-cause inspection linking an observed issue/URL back to specific source code files with ready-to-use fix blueprints. |
| `seo_prioritize` | **Planning / Strategy** | Ranks findings into Quick Wins, Critical Blockers, and Architectural Improvements using `(Impact × Confidence × Reach) / Effort`. |
| `seo_fix_plan` | **Planning / Execution** | Generates an end-to-end code modification and verification plan for AI coding agents. |
| `seo_snapshot_create` | **Verification** | Creates and saves a project SEO baseline snapshot adhering to canonical schema `seo.gravity/v1`. |
| `seo_snapshot_compare` | **Verification** | Diffs two snapshots to compute resolved findings, new regressions, and multidimensional score deltas. |
| `seo_regression_check` | **Verification / CI** | Automated pass/fail regression check with alert messages for CI/CD gates and PR bots. |

### Layer 1: SERP & Competitor Intelligence
| Tool Name | Description |
| :--- | :--- |
| `seo_serp_analyze` | Live Google SERP scraper returning rankings, snippets, People Also Ask (PAA), and SERP features. |
| `seo_competitor_content_gap` | Compares target page against top 3-5 competitors for missing TF-IDF entities, subtopics, and word count deltas. |
| `seo_competitor_profile` | Deep extraction of competitor heading tree (H1-H4), schema types, reading grade, and link ratios. |
| `seo_competitor_diff` | 25-factor side-by-side scorecard comparing your page vs #1 competitor. |
| `seo_forum_discussions_pulse` | Scrapes Reddit & Quora threads ranking for a query to extract user pain points and consensus. |

### Layer 2: Generative Engine Optimization (GEO & AEO)
| Tool Name | Description |
| :--- | :--- |
| `seo_geo_ai_readiness_audit` | Audits content for AI Overviews & Perplexity citation readiness with structured retrieval signals and evidence tiers. |
| `seo_llms_txt_generate` | Generates standard `/llms.txt` and `/llms-full.txt` markdown context files for AI search bots. |
| `seo_ai_bots_robots_audit` | Audits robots.txt permissions specifically for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). |

### Layer 3: Information Gain & E-E-A-T
| Tool Name | Description |
| :--- | :--- |
| `seo_information_gain_score` | Quantifies content novelty vs top 10 SERPs to prevent generic AI fluff penalties. |
| `seo_eeat_audit` | Audits Google E-E-A-T trust signals (Person schema, author bylines, sameAs Wikidata/LinkedIn, publish/modified dates). |

### Layer 4: On-Page & Content Strategy
| Tool Name | Description |
| :--- | :--- |
| `seo_onpage_audit` | Deep on-page audit of pixel width, meta CTR, heading hierarchy, image alt, and slug optimization. |
| `seo_content_brief_generate` | Generates data-backed Content Outline & Brief with target word count, H1/H2/H3 structure, and FAQs. |
| `seo_readability_score` | Computes Flesch Reading Ease, Flesch-Kincaid Grade Level, and Gunning Fog index. |

### Layer 5: Technical SEO & JavaScript Hydration
| Tool Name | Description |
| :--- | :--- |
| `seo_technical_audit` | Inspects HTTP status codes, redirect chains, canonical consistency, meta robots (`noindex` leaks), and SSL. |
| `seo_js_rendering_diff` | Compares raw server HTML vs hydrated client DOM (JavaScript SEO) to detect client-only content or broken tags. |
| `seo_robots_txt_validate` | Validates bot crawlability against specific paths and User-Agents. |
| `seo_sitemap_inspect` | Validates XML sitemaps, sitemap indexes, lastmod timestamps, and URL limit constraints. |
| `seo_internal_links_analyze` | Analyzes internal link equity distribution, anchor texts, generic anchors, and nofollow flags. |

### Layer 6: Keyword Research & Intent
| Tool Name | Description |
| :--- | :--- |
| `seo_keyword_suggestions` | Generates keyword suggestions using Google Autocomplete and Alphabet Soup expansion. |
| `seo_questions_find` | Finds question queries asked by users across Google (Who, What, Where, When, Why, How, Can). |
| `seo_keyword_cluster` | Clusters keyword lists into Topic Pillars and Supporting Articles using semantic similarity. |
| `seo_search_intent_classify` | Classifies keywords into Informational, Navigational, Commercial, or Transactional intent. |

### Layer 7: Schema & Entity Graph
| Tool Name | Description |
| :--- | :--- |
| `seo_entity_salience_map` | Extracts named entities, computes salience scores, and generates SPO relationship triples. |
| `seo_schema_generate` | Generates validated Schema.org JSON-LD scripts (Article, FAQPage, Product, LocalBusiness, Organization). |
| `seo_schema_validate` | Validates structured data against Schema.org and Google Rich Result criteria. |

### Layer 8: Performance & Maintenance
| Tool Name | Description |
| :--- | :--- |
| `seo_pagespeed_audit` | Checks Core Web Vitals (LCP, FCP, CLS, TTFB) with performance optimization fixes. |
| `seo_indexnow_submit` | Submits newly created or updated URLs directly to Bing & Yandex via the IndexNow API protocol. |
| `seo_content_decay_audit` | Scans content for freshness decay (stale year references, outdated stats, broken external links). |

---

## 📄 License

MIT License. Free for open-source and commercial use.
