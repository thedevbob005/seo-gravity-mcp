# 🚀 SEO Gravity MCP

<div align="center">

[![npm version](https://img.shields.io/npm/v/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
[![npm downloads](https://img.shields.io/npm/dm/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue?style=for-the-badge&logo=anthropic)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Zero API Cost](https://img.shields.io/badge/Zero_API_Cost-100%25_Free-orange?style=for-the-badge)

**The Universal Next-Gen SEO, GEO (Generative Engine Optimization) & Competitor Intelligence Suite for AI Coding Agents.**

[⚡ Instant Start](#-instant-start) • [🤖 IDE & Client Setup](#-ai-ide--mcp-client-setup) • [🌟 Features](#-key-features) • [🛠 Tool Catalog](#-complete-tool-catalog-28-tools) • [🧠 AI Workflows](#-autonomous-ai-workflows) • [📄 License](#-license)

</div>

---

## 🌟 Overview

**SEO Gravity MCP** is an enterprise-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides **28 specialized SEO & GEO tools** directly to your favorite AI IDE or MCP client. 

Built specifically for the **2025–2026 modern search landscape**, SEO Gravity enables AI coding assistants (Antigravity, Cursor, Claude Desktop, Windsurf, VS Code Cline/Roo, Zed, etc.) to autonomously audit, optimize, and reverse-engineer websites for both traditional search engines and AI generative answer engines.

### 💡 Why SEO Gravity?
- 🤖 **GEO & AI Search (AEO)**: Tailors content to be cited by **Google AI Overviews**, **Perplexity.ai**, and **ChatGPT Search**.
- 🧠 **Information Gain & E-E-A-T**: Quantifies content novelty vs top-10 SERP competitors to prevent generic AI fluff penalties.
- 🔍 **Live SERP & Content Gap Detection**: Scrapes real-time search results, TF-IDF semantic entities, and generates 25-factor side-by-side competitor scorecards.
- ⚡ **Zero Mandatory Paid API Subscriptions**: 100% functional out of the box using smart web extraction, Google Autocomplete, JSDOM, TF-IDF NLP, and IndexNow.
- 💻 **Dual Mode (Local & Remote)**: Audits local dev servers (`http://localhost:3000`), local workspace files (`.html`/`.md`), raw HTML strings, and live production URLs.
- 🌐 **Universal Compatibility**: Plug-and-play with any MCP-compliant AI client.

---

## ⚡ Instant Start

No manual repository cloning required! You can run SEO Gravity MCP directly via `npx`:

```bash
npx -y seo-gravity-mcp
```

Or install globally:

```bash
npm install -g seo-gravity-mcp
```

---

## 🤖 AI IDE & MCP Client Setup

Add SEO Gravity MCP to your environment by adding the snippet below to your client's configuration file.

### 1. 🟣 Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "seo-gravity": {
      "command": "npx",
      "args": ["-y", "seo-gravity-mcp"],
      "env": {
        "SEO_USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    }
  }
}
```

---

### 2. ⚡ Cursor
Add to `.cursor/mcp.json` in your workspace or configure in **Cursor Settings > Features > MCP Servers**:

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

### 3. 🌊 Windsurf (Codeium)
Add to `~/.codeium/windsurf/mcp_config.json`:

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

### 4. 🚀 Antigravity IDE
Add to `.agents/mcp_config.json` in your workspace or global config (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "seo-gravity": {
      "command": "npx",
      "args": ["-y", "seo-gravity-mcp"],
      "env": {
        "SEO_USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    }
  }
}
```

---

### 5. 💻 VS Code (Roo Code / Cline / Continue)

#### Roo Code & Cline (`cline_mcp_settings.json` / `.roo/mcp.json`):
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

#### Continue.dev (`~/.continue/config.json`):
```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "seo-gravity-mcp"]
        }
      }
    ]
  }
}
```

---

### 6. 📐 Zed Editor
Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "seo-gravity": {
      "command": {
        "path": "npx",
        "args": ["-y", "seo-gravity-mcp"]
      }
    }
  }
}
```

---

### 7. 🛠️ Local Development & Source Build (For Contributors)

If you are developing or customizing SEO Gravity locally:

```bash
git clone https://github.com/thedevbob005/seo-gravity-mcp.git
cd seo-gravity-mcp/seo-gravity-mcp
npm install
npm run build
```

Then point your MCP client to the built file:
```json
{
  "mcpServers": {
    "seo-gravity": {
      "command": "node",
      "args": ["/path/to/seo-gravity-mcp/seo-gravity-mcp/dist/index.js"]
    }
  }
}
```

---

## ⚡ Key Features

* **🏆 Competitor Intelligence**: Live SERP scraping, TF-IDF content gap detection, 25-factor side-by-side scorecard comparison, and Reddit/Forum UGC sentiment tracking.
* **🤖 Generative Engine Optimization (GEO)**: AI citation readiness scoring, automated `/llms.txt` and `/llms-full.txt` generation, and AI bot crawler audits (`GPTBot`, `ClaudeBot`, `PerplexityBot`).
* **🧠 E-E-A-T & Info Gain**: Author `Person` schema verification, `sameAs` Wikidata/LinkedIn linkage, and Google Information Gain Patent scoring.
* **✍️ On-Page Optimization**: Pixel-width title tag auditing, meta CTR checks, heading hierarchy (single H1, nested H2/H3s), and intent-aligned Content Brief generation.
* **⚙️ Technical & JS SEO**: Status codes, canonical tags, XML sitemap validation, robots.txt testing, and **JavaScript Hydration DOM Diffing** (SSR vs CSR).
* **🎯 Keyword Clustering & Intent**: Google Autocomplete (Alphabet Soup a–z), Question finder (Who, What, Where, Why, How), and semantic clustering into Topic Pillars.
* **🌐 Schema Knowledge Graph**: Subject-Predicate-Object (SPO) semantic triples extraction and validated JSON-LD schema generation (Articles, FAQs, Products, LocalBusiness, Breadcrumbs).
* **⚡ Speed & Instant Indexing**: Core Web Vitals (LCP, INP, CLS, TTFB), **IndexNow protocol instant pings** (Bing/Yandex), and Content Decay auditing.

---

## 🛠 Complete Tool Catalog (28 Tools)

SEO Gravity exposes **28 specialized tools** organized across 8 core SEO pillars:

### 1. Competitor & SERP Intelligence
| Tool | Description |
| :--- | :--- |
| `seo_serp_analyze` | Scrapes live Google SERP (top 10–30), PAA questions, Related Searches, and SERP features. |
| `seo_competitor_content_gap` | Reverse-engineers top 3–5 competitor pages vs your target URL/draft to find missing entities & heading gaps. |
| `seo_competitor_profile` | Extracts competitor heading trees, schema types, word counts, reading grades, and link ratios. |
| `seo_competitor_diff` | 25+ factor side-by-side scorecard matrix comparing your page vs a competitor. |
| `seo_forum_discussions_pulse` | Scrapes Reddit/Quora/forum discussions ranking on Google to extract real user sentiment and problems. |

### 2. GEO & AI Search Optimization (AEO / LLM Visibility)
| Tool | Description |
| :--- | :--- |
| `seo_geo_ai_readiness_audit` | Evaluates content citation probability in Google AI Overviews, Perplexity.ai, and ChatGPT Search. |
| `seo_llms_txt_generate` | Generates standard `/llms.txt` and `/llms-full.txt` files for AI search bots. |
| `seo_ai_bots_robots_audit` | Audits `robots.txt` permissions specifically for AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, etc.). |

### 3. Google Information Gain & E-E-A-T Scoring
| Tool | Description |
| :--- | :--- |
| `seo_information_gain_score` | Scores content novelty vs top SERP competitors to prevent generic AI fluff penalties. |
| `seo_eeat_audit` | Inspects Author `Person` schema, `sameAs` authoritative links, and editorial trust signals. |

### 4. On-Page SEO & Content Strategy
| Tool | Description |
| :--- | :--- |
| `seo_onpage_audit` | Audits title pixel width, meta description CTR, heading nesting, image alt tags, and slugs. |
| `seo_content_brief_generate` | Generates data-backed Content Outlines with target word count, H2/H3s, entities, and PAA FAQs. |
| `seo_readability_score` | Computes Flesch-Kincaid, Gunning Fog, and sentence complexity metrics. |

### 5. Technical SEO & JavaScript Hydration
| Tool | Description |
| :--- | :--- |
| `seo_technical_audit` | Status codes, redirect chains, canonical consistency, meta robots, hreflang, and SSL. |
| `seo_js_rendering_diff` | Diffs raw server HTML against hydrated client DOM to spot hidden content or broken tags (JS SEO). |
| `seo_robots_txt_validate` | Tests whether specific paths are crawlable by search engine bots based on `robots.txt`. |
| `seo_sitemap_inspect` | Parses XML sitemaps, verifies `lastmod` tags, and checks single-sitemap URL limits. |
| `seo_internal_links_analyze` | Maps internal link architecture, anchor text distribution, and generic anchor warnings. |

### 6. Keyword Research & Intent Clustering
| Tool | Description |
| :--- | :--- |
| `seo_keyword_suggestions` | Extracts search suggestions using Google Autocomplete and Alphabet Soup modifiers (a–z). |
| `seo_questions_find` | Finds questions real users ask across Google (Who, What, Where, When, Why, How, Can). |
| `seo_keyword_cluster` | Clusters keywords by semantic similarity into Topic Pillars and Supporting Articles. |
| `seo_search_intent_classify` | Classifies keywords into Informational, Navigational, Commercial Investigation, or Transactional intent. |

### 7. Entity Salience & Schema Knowledge Graph
| Tool | Description |
| :--- | :--- |
| `seo_entity_salience_map` | Extracts named entities, computes salience scores, and extracts SPO semantic triples. |
| `seo_schema_generate` | Generates rich JSON-LD markup for Articles, FAQs, Products, LocalBusiness, Breadcrumbs, etc. |
| `seo_schema_validate` | Validates on-page or pasted JSON-LD structured data against Google Rich Result guidelines. |

### 8. Performance, Instant Indexing & Content Freshness
| Tool | Description |
| :--- | :--- |
| `seo_pagespeed_audit` | Evaluates Core Web Vitals (LCP, INP, CLS, TTFB) with performance optimization fixes. |
| `seo_indexnow_submit` | Pings Bing & Yandex via the IndexNow API for instant URL indexation. |
| `seo_content_decay_audit` | Identifies outdated year references ("2020", "2021"), stale statistics, and decay signals. |

---

## 🧠 Autonomous AI Workflows

Here are sample prompts you can give your AI agent once SEO Gravity MCP is installed:

### 🎯 1. Competitor Gap & Content Strategy
> *"Analyze the top ranking competitors for 'best headless cms 2026', identify content gaps on my page `http://localhost:3000/blog/cms-guide`, and generate a data-backed content outline to outrank them."*

### 🤖 2. Generative Engine Optimization (GEO)
> *"Audit my article draft for AI citation readiness (Perplexity, Google AI Overviews), generate an `/llms.txt` file for my site, and check if my robots.txt allows GPTBot and PerplexityBot."*

### ⚙️ 3. JavaScript Hydration SEO Check
> *"Run a JS rendering diff on `http://localhost:3000` to verify that my Next.js client hydration doesn't break meta tags or hide critical anchor links from web crawlers."*

### 🌐 4. Schema Knowledge Graph Generation
> *"Extract high-salience entities from my product page and generate valid Schema.org JSON-LD structured data for a Product with nested FAQPage markup."*

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SEO_USER_AGENT` | Custom User-Agent string used by the scraper when fetching pages | Modern Desktop Chrome User-Agent |
| `INDEXNOW_KEY` | Optional default API key for IndexNow instant indexation pings | Auto-generated or parameter-provided |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
