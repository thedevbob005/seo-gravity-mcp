# 🚀 SEO Gravity (v1.2.0)

<div align="center">

[![npm version](https://img.shields.io/npm/v/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
[![npm downloads](https://img.shields.io/npm/dm/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue?style=for-the-badge&logo=anthropic)
![SARIF Ready](https://img.shields.io/badge/SARIF-GitHub_Code_Scanning-success?style=for-the-badge)
![CLI Ready](https://img.shields.io/badge/CLI-CI%2FCD_Ready-success?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Zero API Cost](https://img.shields.io/badge/Zero_API_Cost-100%25_Free-orange?style=for-the-badge)

**The SEO Engineering Infrastructure Layer for AI Coding Agents & CI/CD Pipelines.**

[⚡ Instant Start](#-instant-start) • [💻 CLI & CI/CD](#-command-line--cicd-runner) • [🛡️ Invariant Truth Layer](#-formal-seo-invariant-registry) • [🏛 5-Layer Architecture](#-5-layer-system-architecture) • [🧩 Framework Adapters](#-modular-framework-adapters) • [🛠 Tool Catalog (35 Tools)](#-complete-tool-catalog) • [📄 License](#-license)

</div>

---

## 🌟 What is SEO Gravity?

**SEO Gravity** is an **SEO engineering infrastructure layer** designed specifically for AI coding agents (Antigravity, Cursor, Claude Code, Windsurf, Cline, Roo Code) and automated CI/CD pipelines.

Instead of operating as a passive reporting tool, SEO Gravity connects **rendered web observations** directly to **source code AST nodes and line numbers** across modern web frameworks (Next.js App/Pages Router, Astro, Vite/React, Remix, SvelteKit), generates actionable code fix blueprints, and enforces invariant-based regression checks.

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │ 1. DISCOVER  │ ──▶ │  2. OBSERVE  │ ──▶ │ 3. DIAGNOSE  │ ──▶ │    4. FIX    │ ──▶ │  5. VERIFY   │
 │ Framework    │     │ Live/Dev SSR │     │ AST Line Nos │     │ AI Modifies  │     │ Invariant    │
 │ Adapters     │     │ Crawl Graph  │     │ Prioritized  │     │ Components   │     │ Regression   │
 │ Source Map   │     │ Provenance   │     │ Action Plan  │     │ Snippets     │     │ Git Stamping │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🏛 5-Layer System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. AGENT & CLI INTERFACE                                    │
│    MCP Server (35 tools) + Standalone CLI (`seo-gravity`)   │
├─────────────────────────────────────────────────────────────┤
│ 2. INTELLIGENCE & REASONING LAYER                           │
│    Root-cause diagnosis, deterministic priority, fix plans  │
├─────────────────────────────────────────────────────────────┤
│ 3. ANALYSIS & INVARIANT LAYER                               │
│    SEO Invariants (HTTP 200, canonical, schema, noindex)    │
├─────────────────────────────────────────────────────────────┤
│ 4. OBSERVATION LAYER (Factual Raw State)                    │
│    Observations ≠ Findings; AST inspection, headers, DOM    │
├─────────────────────────────────────────────────────────────┤
│ 5. PROVIDER & ADAPTER LAYER                                 │
│    Framework Adapters (Next, Astro, Vite), Providers, Cache │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Formal SEO Invariant Registry

SEO Gravity enforces strict **semantic invariants** rather than heuristic score drops. A regression occurs only when a previously satisfied invariant is violated:

| Invariant ID | Name | Target Scope | Description |
| :--- | :--- | :--- | :--- |
| `INV-HTTP-200` | HTTP Success Status | Route | Published routes must return HTTP 200 OK without 4xx/5xx errors. |
| `INV-CANONICAL-RESOLVES` | Canonical URL Declaration | Page | Indexable pages must declare a canonical URL to prevent duplicate indexing. |
| `INV-TITLE-PRESENT` | Title Tag Metadata | Page | Pages must declare unique, descriptive title metadata in AST components. |
| `INV-LINK-ACCESSIBLE` | Link Reachability | Crawl Graph | Public pages must be reachable via internal links (0 orphan pages). |
| `INV-ROBOTS-ALLOWED` | Robots Configuration | Site | Project must provide `robots.txt` or `robots.ts` specifying bot directives. |
| `INV-SITEMAP-PRESENT` | XML Sitemap Configuration | Site | Project must publish `sitemap.xml` or dynamic `sitemap.ts`. |
| `INV-LLMS-TXT` | AI Context Documentation | Site | Project should provide `/llms.txt` for AI agent discovery. |

---

## 🧩 Modular Framework Adapters & Benchmark

Tested with **100% correlation accuracy** across 7 web application frameworks:

| Framework Adapter | Detection | Route Discovery | AST Inspection | Benchmark |
| :--- | :--- | :--- | :--- | :---: |
| **`NextAppAdapter`** | `next` + `app/` | App Router hierarchy, route groups `(group)`, dynamic `[slug]` | Pinpoints `metadata` export & `generateMetadata()` lines | **100%** |
| **`NextPagesAdapter`** | `next` + `pages/` | Pages router hierarchy, dynamic `[id]` | Scans `<Head>` & `<NextSeo>` JSX components | **100%** |
| **`AstroAdapter`** | `astro` + `src/pages` | `.astro`, `.md`, `.mdx` pages | Scans Astro frontmatter & `<title>` tags | **100%** |
| **`ViteReactAdapter`** | `vite` / `react` | `index.html` + React Router routes | Scans `<Helmet>` & route definition trees | **100%** |
| **`RemixAdapter`** | `@remix-run/react` | `app/routes/` | Inspects `meta` and `links` export functions | **100%** |
| **`SvelteKitAdapter`** | `@sveltejs/kit` | `src/routes/` (`+page.svelte`) | Scans `<svelte:head>` components | **100%** |
| **`StaticAdapter`** | Static HTML files | Recursive HTML directory traversal | Direct DOM / meta element inspection | **100%** |

---

## 💻 Command-Line & CI/CD Runner (SARIF Ready)

SEO Gravity includes a standalone CLI binary (`seo-gravity`) with native **SARIF v2.1.0** export for GitHub Code Scanning:

```bash
# 1. Audit project (Terminal / JSON / SARIF)
npx seo-gravity-mcp audit --project ./my-app
npx seo-gravity-mcp audit --project ./my-app --format sarif --output seo-findings.sarif

# 2. Create baseline snapshot
npx seo-gravity-mcp snapshot --project ./my-app --output baseline.json

# 3. Check for SEO regressions in CI/CD PR gate (Exits with 0 or 1)
npx seo-gravity-mcp check --project ./my-app --baseline baseline.json

# 4. Targeted Semantic Git differential audit on modified routes only
npx seo-gravity-mcp diff --project ./my-app --base-ref origin/main
```

### GitHub Actions CI/CD Integration

```yaml
name: SEO Quality Gate

on: [push, pull_request]

jobs:
  seo-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run SEO Invariant Regression Check
        run: npx seo-gravity-mcp check --project . --baseline .seo-baseline.json --format sarif --output results.sarif

      - name: Upload SARIF to GitHub Security Tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

---

## ⚡ Instant Start (MCP Server)

```bash
npx -y seo-gravity-mcp
```

### AI Client Configurations

#### Cursor (`.cursor/mcp.json`)
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

#### Claude Desktop (`claude_desktop_config.json`)
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

## 🛠 Complete Tool Catalog

### Layer 0: Agent Orchestration & Remediation (Flagship)
| Tool Name | Operational Class | Description |
| :--- | :--- | :--- |
| `seo_project_audit` | **Planning / Audit** | Scans workspace framework, discovers routes, correlates source files, builds crawl graph, and computes multidimensional SEO health. |
| `seo_diagnose` | **Planning / Diagnose** | Deep root-cause AST inspection linking an observed issue/URL back to specific source code line ranges with ready-to-use fix blueprints. |
| `seo_prioritize` | **Planning / Strategy** | Ranks findings into Quick Wins, Critical Blockers, and Architectural Improvements using `(Impact × Confidence × Reach) / Effort`. |
| `seo_fix_plan` | **Planning / Execution** | Generates an end-to-end code modification and verification plan for AI coding agents. |
| `seo_snapshot_create` | **Verification** | Creates and saves a project SEO baseline snapshot with Git commit stamping adhering to schema `seo.gravity/v1`. |
| `seo_snapshot_compare` | **Verification** | Invariant-based diffing of two snapshots to isolate resolved findings, new regressions, and multidimensional score deltas. |
| `seo_regression_check` | **Verification / CI** | Automated pass/fail regression check with alert messages for CI/CD gates and PR bots. |

### Layers 1–8: Specialized SEO & GEO Engines
- **Layer 1 (SERP & Competitors)**: `seo_serp_analyze`, `seo_competitor_content_gap`, `seo_competitor_profile`, `seo_competitor_diff`, `seo_forum_discussions_pulse`
- **Layer 2 (GEO & AI Search)**: `seo_geo_ai_readiness_audit`, `seo_llms_txt_generate`, `seo_ai_bots_robots_audit`
- **Layer 3 (Info Gain & E-E-A-T)**: `seo_information_gain_score`, `seo_eeat_audit`
- **Layer 4 (On-Page)**: `seo_onpage_audit`, `seo_content_brief_generate`, `seo_readability_score`
- **Layer 5 (Technical SEO)**: `seo_technical_audit`, `seo_js_rendering_diff`, `seo_robots_txt_validate`, `seo_sitemap_inspect`, `seo_internal_links_analyze`
- **Layer 6 (Keywords & Intent)**: `seo_keyword_suggestions`, `seo_questions_find`, `seo_keyword_cluster`, `seo_search_intent_classify`
- **Layer 7 (Schema & Entity)**: `seo_entity_salience_map`, `seo_schema_generate`, `seo_schema_validate`
- **Layer 8 (Speed & Maintenance)**: `seo_pagespeed_audit`, `seo_indexnow_submit`, `seo_content_decay_audit`

---

## 📄 License

MIT License. Copyright (c) 2026 thedevbob005. Free for open-source and commercial use.
