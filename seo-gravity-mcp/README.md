# 🚀 SEO Gravity (v1.3.0)

<div align="center">

[![npm version](https://img.shields.io/npm/v/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
[![npm downloads](https://img.shields.io/npm/dm/seo-gravity-mcp?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/seo-gravity-mcp)
![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue?style=for-the-badge&logo=anthropic)
![SARIF Ready](https://img.shields.io/badge/SARIF-GitHub_Code_Scanning-success?style=for-the-badge)
![PR Comment Ready](https://img.shields.io/badge/PR_Comment-GitHub_Ready-blueviolet?style=for-the-badge)
![17 Frameworks](https://img.shields.io/badge/Frameworks-17_Supported-blueviolet?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Zero API Cost](https://img.shields.io/badge/Zero_API_Cost-100%25_Free-orange?style=for-the-badge)

**The SEO Engineering Infrastructure Layer for AI Coding Agents & CI/CD Pipelines.**

[⚡ Instant Start](#-instant-start) • [💻 CLI & CI/CD](#-command-line--cicd-runner) • [🛡️ Invariant Truth & Policy](#-formal-seo-invariant-registry--policy-engine) • [🏛 5-Layer Architecture](#-5-layer-system-architecture) • [🧩 17 Framework Adapters](#-17-modular-framework-adapters--benchmark) • [🛠 Tool Catalog (35 Tools)](#-complete-tool-catalog) • [📄 License](#-license)

</div>

---

## 🌟 What is SEO Gravity?

**SEO Gravity** is an **SEO engineering infrastructure layer** designed specifically for AI coding agents (Antigravity, Cursor, Claude Code, Windsurf, Cline, Roo Code) and automated CI/CD pipelines.

Instead of operating as a passive reporting tool, SEO Gravity connects **rendered web observations** directly to **source code AST nodes, templates, and line numbers** across **17 modern web frameworks, full-stack backend architectures, and CMS ecosystems** (Next.js, WordPress, Laravel, Symfony, Astro, Vite, Remix, SvelteKit, Nuxt 3, TanStack Start, SolidStart, Qwik City, Gatsby, and Markdown SSGs), evaluates semantic SEO invariants against customizable project policies, generates actionable code fix blueprints, and enforces automated regression gates.

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │ 1. DISCOVER  │ ──▶ │  2. OBSERVE  │ ──▶ │ 3. DIAGNOSE  │ ──▶ │    4. FIX    │ ──▶ │  5. VERIFY   │
 │ 17 Framework │     │ Live/Dev SSR │     │ AST Line Nos │     │ AI Modifies  │     │ Invariant    │
 │ Adapters     │     │ Crawl Graph  │     │ Prioritized  │     │ Components   │     │ Regression   │
 │ Source Map   │     │ Provenance   │     │ Action Plan  │     │ Snippets     │     │ Git Stamping │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🏛 5-Layer System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: AGENT & CLI INTERFACE                                              │
│ • MCP Server (35 tools) + Standalone CLI (`seo-gravity`)                    │
│ • GitHub PR Comment Formatter (`--format pr-comment`)                       │
│ • OASIS SARIF v2.1.0 Exporter (`--format sarif`)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: INTELLIGENCE & REASONING LAYER                                     │
│ • Root-cause diagnosis, deterministic priority, fix plans                   │
│ • Strategic Opportunity Engine & SEO Experimentation Engine                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: ANALYSIS, POLICY & INVARIANT LAYER                                 │
│ • Formal Invariant Registry (Requirement Levels vs Severity)                │
│ • Project Policy Engine (`.seo-gravity.yml` & 5 preset profiles)            │
│ • Semantic AST Git Differential Engine (Risk scoring)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: OBSERVATION LAYER (Factual Raw State)                              │
│ • Observations ≠ Findings; Page Identity Normalization                      │
│ • Polymorphic Evidence: AST, Template, RouteConfig, DOM, Header, Runtime    │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: PROVIDER & ADAPTER LAYER                                           │
│ • 17 Framework Adapters (JS/TS/PHP/SSG), Providers, Cache Provenance        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Formal SEO Invariant Registry & Policy Engine

SEO Gravity evaluates facts against formal invariant contracts and allows teams to configure organizational standards via `.seo-gravity.yml`:

| Invariant ID | Name | Scope | Requirement Level | Severity | Semantic Failure Condition |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `INV-HTTP-200` | HTTP Success Status | Route | **`REQUIRED`** | Critical | Published routes return 4xx or 5xx HTTP status. |
| `INV-CANONICAL-RESOLVES` | Canonical URL Declaration | Page | **`CONDITIONAL`** | High | Indexable page lacks `<link rel="canonical">` or canonical metadata. |
| `INV-TITLE-PRESENT` | Title Tag Metadata | Page | **`REQUIRED`** | High | Component metadata or `<title>` tag is missing. |
| `INV-LINK-ACCESSIBLE` | Link Reachability | Crawl Graph | **`CONDITIONAL`** | Medium | Public page has 0 internal inlinks (Orphan Page). |
| `INV-ROBOTS-ALLOWED` | Robots Policy Determinable | Site | **`CONDITIONAL`** | Medium | Bot directives are indeterminable or block critical assets. |
| `INV-SITEMAP-PRESENT` | XML Sitemap Configuration | Site | **`RECOMMENDED`** | Medium | Missing `sitemap.xml` or dynamic sitemap route. |
| `INV-LLMS-TXT` | AI Context Documentation | Site | **`RECOMMENDED`** | Low | Missing `/llms.txt` context file for AI crawlers (GEO). |

### Project Policy Profiles (`.seo-gravity.yml`)

Configure project policies with built-in presets (`strict`, `balanced`, `startup`, `ecommerce`, `documentation`):

```yaml
version: 1
profile: balanced # strict | balanced | startup | ecommerce | documentation

policy:
  canonical: required
  sitemap: recommended
  llms_txt: recommended

regression:
  fail_on_levels: [REQUIRED, CONDITIONAL]
  fail_on_severities: [critical, high]
```

---

## 🧩 17 Modular Framework Adapters & Benchmark

Tested with **100% correlation accuracy** across 17 web application frameworks and CMS ecosystems:

| Category | Framework Adapter | Detection Signature | Routing & Template Model | Benchmark Result |
| :--- | :--- | :--- | :--- | :---: |
| **JS / TS SSR** | **`NextAppAdapter`** | `next` + `app/` | App Router hierarchy, route groups `(group)`, dynamic `[slug]` | **100%** |
| **JS / TS SSR** | **`NextPagesAdapter`** | `next` + `pages/` | Pages router hierarchy, dynamic `[id]` | **100%** |
| **JS / TS SSR** | **`AstroAdapter`** | `astro` + `src/pages` | `.astro`, `.md`, `.mdx` pages | **100%** |
| **JS / TS SSR** | **`RemixAdapter`** | `@remix-run/react` | Flat routes `app/routes/`, index `_index.tsx`, dynamic `$slug` | **100%** |
| **JS / TS SSR** | **`SvelteKitAdapter`** | `@sveltejs/kit` | `src/routes/` (`+page.svelte`), dynamic `[slug]` | **100%** |
| **JS / TS SSR** | **`NuxtAdapter`** | `nuxt` in `package.json` | `pages/**/*.vue` with `useHead()`, `useSeoMeta()` | **100%** |
| **JS / TS SSR** | **`TanStackRouterAdapter`** | `@tanstack/react-router` | `src/routes/` with `createFileRoute` & `head()` | **100%** |
| **JS / TS SSR** | **`SolidStartAdapter`** | `@solidjs/start` | `src/routes/` with `<Title>`, `<Meta>`, `<Link>` | **100%** |
| **JS / TS SSR** | **`QwikCityAdapter`** | `@builder.io/qwik-city` | `src/routes/**/index.tsx` with `DocumentHead` | **100%** |
| **JS / TS SSG** | **`GatsbyAdapter`** | `gatsby` in `package.json` | `src/pages/` with `export const Head` | **100%** |
| **PHP / CMS** | **`WordPressAdapter`** | `style.css` / `wp-content` | Classic templates (`front-page.php`, `single.php`) & FSE block templates | **100%** |
| **PHP Fullstack** | **`LaravelAdapter`** | `artisan` / `laravel/framework` | `routes/web.php` + Blade templates (`@section('title')`) | **100%** |
| **PHP Fullstack** | **`SymfonyAdapter`** | `symfony.lock` / `composer.json` | `config/routes.yaml` / `#[Route]` + Twig templates (`{% block title %}`) | **100%** |
| **PHP Classic** | **`PhpClassicAdapter`** | `*.php` files | File-based routing (`index.php`, `about.php`) | **100%** |
| **Markdown SSG** | **`SsgAdapter`** | `hugo.toml`, `_config.yml`, `11ty` | `content/**/*.md`, `_posts/**/*.md` YAML/TOML frontmatter | **100%** |
| **React SPA** | **`ViteReactAdapter`** | `vite` + `react` | `index.html` + React Router route trees | **100%** |
| **Static HTML** | **`StaticAdapter`** | Static `.html` files | Recursive HTML directory traversal | **100%** |

---

## 💻 Command-Line & CI/CD Runner

SEO Gravity includes a standalone CLI binary (`seo-gravity`) with native **SARIF v2.1.0** and **GitHub PR Comment** export:

```bash
# 1. Audit project (Terminal / JSON / SARIF / PR-Comment)
npx seo-gravity-mcp audit --project ./my-app
npx seo-gravity-mcp audit --project ./my-app --format sarif --output seo-findings.sarif

# 2. Check regressions in CI/CD against project policy (Exits 0 or 1)
npx seo-gravity-mcp check --project ./my-app --baseline baseline.json --policy .seo-gravity.yml --format pr-comment

# 3. Targeted Semantic Git differential audit & SEO Code Review on modified routes
npx seo-gravity-mcp review --project ./my-app --base-ref origin/main --format pr-comment --output pr-comment.md
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
        run: |
          npx seo-gravity-mcp check \
            --project . \
            --baseline .seo-baseline.json \
            --format sarif \
            --output results.sarif

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

## 🛠 Complete Tool Catalog (35 Tools)

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
