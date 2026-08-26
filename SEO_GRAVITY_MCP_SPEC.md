# 🚀 SEO Gravity: Full System Technical Specification & Architectural Blueprint (v1.2.1)

> **The SEO Engineering Infrastructure Layer for AI Coding Agents & CI/CD Pipelines.**
> Author: **thedevbob005** | Repository: [`thedevbob005/seo-gravity-mcp`](https://github.com/thedevbob005/seo-gravity-mcp) | Version: **1.2.1**

---

## 📑 Table of Contents

1. [System Overview & Positioning](#1-system-overview--positioning)
2. [5-Layer System Architecture](#2-5-layer-system-architecture)
3. [Canonical Data Model & Invariant Truth System](#3-canonical-data-model--invariant-truth-system)
4. [17-Framework Adapter Matrix & Correlation Engine](#4-17-framework-adapter-matrix--correlation-engine)
5. [Complete 35-Tool Catalog & Operational Protocol](#5-complete-35-tool-catalog--operational-protocol)
6. [CI/CD Quality Gate & SARIF v2.1.0 Specification](#6-cicd-quality-gate--sarif-v210-specification)
7. [Pluggable Provider Layer & Content-Hash Caching](#7-pluggable-provider-layer--content-hash-caching)
8. [Automated Benchmark Suite & Precision Guarantees](#8-automated-benchmark-suite--precision-guarantees)

---

## 1. System Overview & Positioning

Search Engine Optimization (SEO) and Generative Engine Optimization (GEO) in modern software engineering require moving beyond passive third-party dashboard reports. 

**SEO Gravity** is an **SEO engineering infrastructure layer** purpose-built for AI coding agents (Antigravity, Cursor, Claude Code, Windsurf, Cline, Roo Code) and automated CI/CD pipelines.

### Core Design Philosophy: *"Code computes. AI interprets."*
- **Deterministic Computation**: Framework detection, route mapping, AST line pinpointing, crawl graphs, invariant evaluation, and priority ranking are calculated with deterministic algorithms.
- **AI Agent Orchestration**: High-level agents receive structured JSON findings, exact source code coordinates, and ready-to-apply code fix blueprints to remediate issues autonomously.
- **Invariant-First Regression Gating**: Regressions in CI/CD are judged by semantic ground truth invariants (e.g. 200 $\rightarrow$ 404, canonical present $\rightarrow$ missing, indexable $\rightarrow$ noindex), eliminating flaky score-based heuristics.

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │ 1. DISCOVER  │ ──▶ │  2. OBSERVE  │ ──▶ │ 3. DIAGNOSE  │ ──▶ │    4. FIX    │ ──▶ │  5. VERIFY   │
 │ 17 Framework │     │ Live/Dev SSR │     │ AST Line Nos │     │ AI Modifies  │     │ Invariant    │
 │ Adapters     │     │ Crawl Graph  │     │ Prioritized  │     │ Components   │     │ Regression   │
 │ Source Map   │     │ Provenance   │     │ Action Plan  │     │ Snippets     │     │ Git Stamping │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. 5-Layer System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: AGENT & CLI INTERFACE                                              │
│ • Modular MCP Server (`src/server/server.ts`, `src/server/registry.ts`)     │
│ • Standalone CLI Binary (`src/cli.ts`) with SARIF & JSON output             │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: INTELLIGENCE & REASONING LAYER                                     │
│ • Deterministic Priority Scoring: (Impact × Confidence × Reach) / Effort     │
│ • Root-Cause Diagnostic Engine (`src/tools/orchestration.ts`)                │
│ • Strategic Opportunity Engine (`src/utils/opportunityEngine.ts`)           │
│ • SEO Experimentation Engine (`src/utils/experimentEngine.ts`)              │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: ANALYSIS & INVARIANT LAYER                                         │
│ • Formal Invariant Registry (`src/invariants/registry.ts`)                  │
│ • Git Baseline Snapshot Engine (`src/utils/snapshotEngine.ts`)              │
│ • Semantic AST Git Differential Engine (`src/utils/gitDiffEngine.ts`)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: OBSERVATION LAYER (Factual Raw State)                              │
│ • Separation of Raw Observations from Computed Findings                     │
│ • Page Identity Normalization (`logicalPageId`)                             │
│ • AST Line-Range & Coordinate Locator (`src/utils/astLocator.ts`)           │
│ • Breadth-First Crawl Graph Builder (`src/utils/crawlGraph.ts`)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: PROVIDER & ADAPTER LAYER                                           │
│ • 17 Modular Framework Adapters (`src/adapters/`)                           │
│ • Pluggable Provider Layer (`src/providers/`)                               │
│ • Content-Hash Cache Manager with Provenance (`src/utils/cacheManager.ts`)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Canonical Data Model & Invariant Truth System

### 3.1 Separation of Observations vs Findings

To maintain absolute data integrity, SEO Gravity separates raw measurements from diagnostic conclusions:

1. **`Observation`**: An immutable measurement of factual state from a verified source.
   ```typescript
   export interface Observation {
     id: string;
     logicalPageId: string;
     observedUrl: string;
     key: string;
     rawValue: any;
     normalizedValue: any;
     provenance: Provenance;
   }
   ```
2. **`Finding`**: An actionable diagnostic conclusion derived by evaluating observations against SEO rules and invariants.
   ```typescript
   export interface Finding {
     id: string;
     ruleId: string;
     title: string;
     severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
     category: 'technical' | 'onpage' | 'schema' | 'performance' | 'geo' | 'architecture';
     affectedUrl: string;
     sourceLocation?: SourceLocation;
     evidence: FindingEvidence;
     provenance: Provenance;
     remediation: RemediationPlan;
     priorityScore: number;
   }
   ```

### 3.2 Formal SEO Invariant Registry

SEO Gravity evaluates facts against formal invariant contracts defined in [`src/invariants/registry.ts`](file:///d:/aide/seo-gravity-mcp/src/invariants/registry.ts):

| Invariant ID | Name | Target Scope | Semantic Failure Condition |
| :--- | :--- | :--- | :--- |
| `INV-HTTP-200` | HTTP Success Status | Route | HTTP status is 4xx, 5xx, or route unresolvable |
| `INV-CANONICAL-RESOLVES` | Canonical URL Declaration | Page | Indexable page lacks `<link rel="canonical">` or canonical metadata |
| `INV-TITLE-PRESENT` | Title Tag Metadata | Page | AST/HTML has empty or missing `<title>` |
| `INV-LINK-ACCESSIBLE` | Link Reachability | Crawl Graph | Public page has 0 internal inlinks (Orphan Page) |
| `INV-ROBOTS-ALLOWED` | Robots Configuration | Site | Missing `robots.txt` or syntax disallows essential assets |
| `INV-SITEMAP-PRESENT` | XML Sitemap Configuration | Site | Missing `sitemap.xml` or dynamic sitemap route |
| `INV-LLMS-TXT` | AI Context Documentation | Site | Missing `/llms.txt` context file for AI crawlers |

---

## 4. 17-Framework Adapter Matrix & Correlation Engine

SEO Gravity includes dedicated adapters implementing the `FrameworkAdapter` interface, guaranteeing **100% correlation precision**:

| Category | Framework Adapter | Detection Rules | Route & Template Parsing | AST / Code Inspection Target |
| :--- | :--- | :--- | :--- | :--- |
| **JS / TS SSR** | `NextAppAdapter` | `next` + `app/` | App Router directory hierarchy, route groups `(group)`, parallel `@slot`, dynamic `[slug]` | `export const metadata: Metadata`, `generateMetadata()`, `sitemap.ts`, `robots.ts` |
| **JS / TS SSR** | `NextPagesAdapter` | `next` + `pages/` | Pages router hierarchy, dynamic `[id]` | `<Head>`, `<title>`, `<meta>`, `<NextSeo>`, canonical `<link>` |
| **JS / TS SSR** | `AstroAdapter` | `astro` in dependencies | `src/pages/**/*.{astro,md,mdx}` | Frontmatter YAML/JS, `<title>`, `astro:head` |
| **JS / TS SSR** | `RemixAdapter` | `@remix-run/react` | Flat routes in `app/routes/`, index `_index.tsx`, dynamic `$slug` | `export const meta: MetaFunction`, `export const links` |
| **JS / TS SSR** | `SvelteKitAdapter` | `@sveltejs/kit` | `src/routes/` directory tree, `+page.svelte` | `<svelte:head>`, `<title>`, `<meta>`, canonical links |
| **JS / TS SSR** | `NuxtAdapter` | `nuxt` in dependencies | `pages/**/*.vue`, dynamic `[slug].vue` | `useHead()`, `useSeoMeta()`, `definePageMeta()` |
| **JS / TS SSR** | `TanStackRouterAdapter` | `@tanstack/react-router` | `src/routes/` route trees | `createFileRoute()`, `head()` metadata functions |
| **JS / TS SSR** | `SolidStartAdapter` | `@solidjs/start` | `src/routes/` (`[id].tsx`) | `<Title>`, `<Meta>`, `<Link rel="canonical">` |
| **JS / TS SSR** | `QwikCityAdapter` | `@builder.io/qwik-city` | `src/routes/**/index.tsx` | `export const head: DocumentHead` |
| **JS / TS SSG** | `GatsbyAdapter` | `gatsby` in dependencies | `src/pages/**/*.tsx` | `export const Head = () => ...` |
| **PHP / CMS** | `WordPressAdapter` | `style.css` / `wp-content` | Classic templates (`front-page.php`, `single.php`) + FSE blocks | `wp_head()`, `add_theme_support('title-tag')`, Yoast/RankMath hooks |
| **PHP Fullstack** | `LaravelAdapter` | `artisan` / `laravel/framework` | `routes/web.php` parsing + Blade templates | `@section('title')`, `<x-slot:title>`, `<title>` |
| **PHP Fullstack** | `SymfonyAdapter` | `symfony.lock` / `composer.json` | `config/routes.yaml` / `#[Route]` + Twig templates | `{% block title %}`, metadata blocks |
| **PHP Classic** | `PhpClassicAdapter` | Multiple `*.php` files | Direct file routing (`index.php`, `about.php`) | Template tags, header includes, `<title>`, `<meta>` |
| **Markdown SSG** | `SsgAdapter` | `hugo.toml`, `_config.yml`, `11ty` | `content/**/*.md`, `_posts/**/*.md` | YAML/TOML frontmatter (`title:`, `canonical:`) |
| **React SPA** | `ViteReactAdapter` | `vite` + `react` | `index.html` + React Router tree | `<Helmet>`, `<title>`, `<meta>` in component trees |
| **Static HTML** | `StaticAdapter` | Fallback for any HTML site | Recursive HTML traversal | Direct DOM / meta tag inspection |

---

## 5. Complete 35-Tool Catalog & Operational Protocol

### Layer 0: Agent Orchestration & Remediation (Flagship Suite)

```text
┌─────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ TOOL NAME               │ OPERATIONAL SPECIFICATION                                              │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_project_audit`     │ Discovers framework routes, builds crawl graph, detects AST metadata,   │
│                         │ and outputs multidimensional health scores with prioritized findings.  │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_diagnose`          │ Deep AST root-cause inspection linking an observed URL or error back  │
│                         │ to exact source files, AST line numbers, and actionable fix snippets.  │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_prioritize`        │ Sorts all findings into deterministic action sprints: Quick Wins,      │
│                         │ Critical Blockers, Architectural Changes, and Maintenance.             │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_fix_plan`          │ Generates a structured multi-step code modification and test plan      │
│                         │ for autonomous coding agents.                                          │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_snapshot_create`   │ Captures an immutable project baseline stamped with Git commit SHA     │
│                         │ and schema `seo.gravity/v1`.                                           │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_snapshot_compare`  │ Diffs two snapshots, isolating RESOLVED findings and NEW_REGRESSION    │
│                         │ invariant violations.                                                  │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ `seo_regression_check`  │ Automated pass/fail regression gate for CI/CD PR pipelines.            │
└─────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

### Layers 1–8: Specialized SEO & GEO Engines (28 Tools)

- **Layer 1 (SERP & Competitors)**: `seo_serp_analyze`, `seo_competitor_content_gap`, `seo_competitor_profile`, `seo_competitor_diff`, `seo_forum_discussions_pulse`
- **Layer 2 (GEO & AI Search)**: `seo_geo_ai_readiness_audit`, `seo_llms_txt_generate`, `seo_ai_bots_robots_audit`
- **Layer 3 (Info Gain & E-E-A-T)**: `seo_information_gain_score`, `seo_eeat_audit`
- **Layer 4 (On-Page)**: `seo_onpage_audit`, `seo_content_brief_generate`, `seo_readability_score`
- **Layer 5 (Technical SEO)**: `seo_technical_audit`, `seo_js_rendering_diff`, `seo_robots_txt_validate`, `seo_sitemap_inspect`, `seo_internal_links_analyze`
- **Layer 6 (Keywords & Intent)**: `seo_keyword_suggestions`, `seo_questions_find`, `seo_keyword_cluster`, `seo_search_intent_classify`
- **Layer 7 (Schema & Entity)**: `seo_entity_salience_map`, `seo_schema_generate`, `seo_schema_validate`
- **Layer 8 (Speed & Maintenance)**: `seo_pagespeed_audit`, `seo_indexnow_submit`, `seo_content_decay_audit`

---

## 6. CI/CD Quality Gate & SARIF v2.1.0 Specification

SEO Gravity outputs standard **OASIS SARIF v2.1.0** reports directly consumable by GitHub Code Scanning:

```bash
npx seo-gravity-mcp audit --project ./app --format sarif --output results.sarif
npx seo-gravity-mcp check --project ./app --baseline .seo-baseline.json
```

### Formal CLI Exit Codes

| Exit Code | Classification | Meaning |
| :---: | :--- | :--- |
| `0` | **Pass** | All checks passed, no SEO invariant regressions detected. |
| `1` | **Regression** | One or more critical SEO invariants were violated. |
| `2` | **Config Error** | Invalid command flags or missing configuration. |
| `3` | **Analyzer Error** | Framework analysis failure or unhandled exception. |

---

## 7. Pluggable Provider Layer & Content-Hash Caching

- **Pluggable Providers** (`src/providers/`): Out-of-the-box native zero-cost web scrapers with optional API key overrides for Google PageSpeed, DataForSEO, ValueSERP, or Serper.
- **Cache Provenance** (`src/utils/cacheManager.ts`): All cached responses include explicit provenance headers:
  ```json
  {
    "isCached": true,
    "cachedAt": "2026-08-27T00:00:00.000Z",
    "ageMs": 420,
    "ttlMs": 299580,
    "provider": "typescript_ast",
    "key": "test_ast:0f30d14bec76b96a"
  }
  ```

---

## 8. Automated Benchmark Suite & Precision Guarantees

SEO Gravity maintains two mandatory automated benchmark suites:

1. **Correlation Accuracy Benchmark** (`src/benchmark/correlationBenchmark.ts`):
   - Asserts `URL ➔ Discovered Route ➔ Source File Path ➔ AST Node Range` precision.
   - **Score: 17/17 frameworks passed (100% precision).**
2. **Invariant Recall & Precision Benchmark** (`src/benchmark/invariantBenchmark.ts`):
   - Asserts invariant evaluation accuracy and 0 false-positive regression diffs.
   - **Score: 100% precision.**

---

## 📄 License & Maintainer

- **Author**: `thedevbob005`
- **License**: MIT
- **NPM Package**: [`seo-gravity-mcp`](https://www.npmjs.com/package/seo-gravity-mcp)
