---
name: seo-mastery
description: >-
  Expert SEO & Generative Engine Optimization (GEO) strategist, code correlator, and technical remediation engine.
  Use when discovering project routes, diagnosing root-cause SEO issues in code across 17 frameworks (Next.js, WordPress,
  Laravel, Symfony, Astro, Vite, Remix, SvelteKit, Nuxt 3, TanStack, Solid, Qwik, Gatsby, SSGs), evaluating SEO invariants
  against policy (.seo-gravity.yml), executing code fixes, verifying regression diffs, generating PR comments, or optimizing for AI search.
---

# 🚀 SEO & GEO Mastery Guide for AI Agents (v1.3.0)

This skill teaches the agent how to autonomously orchestrate the **SEO Gravity MCP** engine (35 tools across 9 operational layers) to inspect, diagnose, remediate, and continuously verify website SEO with **zero regressions** and **formal invariant guarantees**.

---

## 🎯 The 5-Stage Closed-Loop Remediation Workflow

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │ 1. DISCOVER  │ ──▶ │  2. OBSERVE  │ ──▶ │ 3. DIAGNOSE  │ ──▶ │    4. FIX    │ ──▶ │  5. VERIFY   │
 │ 17 Framework │     │ Live/Dev SSR │     │ AST/Template │     │ AI Modifies  │     │ Invariant    │
 │ Adapters     │     │ Crawl Graph  │     │ Prioritized  │     │ Source Code  │     │ Policy Gates │
 │ Source Map   │     │ Evidence     │     │ Action Plan  │     │ Fix Snippets │     │ Git Stamping │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Stage 1: Discover & Project Inspection
1. Call `seo_project_audit` with `project_path` (e.g. `.` or `/path/to/project`) and optional `base_url` (`http://localhost:3000`).
2. Supported Frameworks (17 Adapters):
   - **JS/TS SSR/SSG**: Next.js (App & Pages), Astro, Remix, SvelteKit, Nuxt 3, TanStack Start, SolidStart, Qwik City, Gatsby, Vite React, Static HTML.
   - **PHP / CMS**: WordPress (Classic & FSE), Laravel (Blade + `web.php`), Symfony (Twig + `routes.yaml`), PHP Classic.
   - **Markdown SSGs**: Hugo, Jekyll, 11ty.
3. Call `seo_snapshot_create` to record a Git commit-stamped baseline snapshot before making modifications.

### Stage 2: Observe Live, AST & Competitor Signals
1. Call `seo_js_rendering_diff` to detect client-side hydration drift or missing SSR meta tags.
2. Call `seo_serp_analyze` and `seo_competitor_content_gap` to extract top-ranking competitor entity coverage.
3. Call `seo_forum_discussions_pulse` to understand search intent and audience sentiment.

### Stage 3: Diagnose & Prioritize (AST & Template Pinpointing)
1. Call `seo_diagnose` on target routes to inspect exact source file coordinates (`startLine`, `endLine`) or template blocks (`@section('title')`, `{% block title %}`, `wp_head()`, `generateMetadata()`).
2. Call `seo_prioritize` to group findings by `(Impact × Confidence × Reach) / Effort` into:
   - **Quick Wins**: High impact, low effort.
   - **Critical Blockers**: Severe invariant breaches affecting core indexing.
   - **Architectural Improvements**: Medium/high effort site-wide structural enhancements.
3. Call `seo_fix_plan` to generate a structured remediation blueprint.

### Stage 4: Code Remediation
1. Apply suggested modifications to target components, templates, or route configs.
2. Generate `/llms.txt` using `seo_llms_txt_generate` if missing (classified as `RECOMMENDED`).
3. Verify robots directives using `seo_ai_bots_robots_audit` for AI search crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`).

### Stage 5: Invariant Verification & Policy Gate
1. Check project policy in `.seo-gravity.yml` (profiles: `strict`, `balanced`, `startup`, `ecommerce`, `documentation`).
2. Re-run `seo_regression_check` against the baseline snapshot.
3. Verify that:
   - `status` is `NO_REGRESSION` or `IMPROVEMENTS_ONLY`.
   - Invariants (`INV-HTTP-200`, `INV-CANONICAL-RESOLVES`, `INV-TITLE-PRESENT`, `INV-LINK-ACCESSIBLE`, `INV-ROBOTS-ALLOWED`, `INV-SITEMAP-PRESENT`, `INV-LLMS-TXT`) are satisfied.
   - No regressions breach the project's policy gate.

---

## 🛡️ Formal SEO Invariants & Requirement Levels

| Invariant ID | Name | Requirement Level | Severity | Description |
| :--- | :--- | :---: | :---: | :--- |
| `INV-HTTP-200` | HTTP Success Status | **`REQUIRED`** | Critical | Published routes return HTTP 200 without 4xx/5xx errors. |
| `INV-CANONICAL-RESOLVES` | Canonical URL | **`CONDITIONAL`** | High | Indexable pages declare a canonical URL. |
| `INV-TITLE-PRESENT` | Title Metadata | **`REQUIRED`** | High | Component/template declares a valid `<title>`. |
| `INV-LINK-ACCESSIBLE` | Link Reachability | **`CONDITIONAL`** | Medium | Public pages must not be isolated orphans. |
| `INV-ROBOTS-ALLOWED` | Robots Policy | **`CONDITIONAL`** | Medium | Crawl policy is determinable and permits indexing. |
| `INV-SITEMAP-PRESENT` | XML Sitemap | **`RECOMMENDED`** | Medium | Sitemap is published for efficient route discovery. |
| `INV-LLMS-TXT` | AI Context | **`RECOMMENDED`** | Low | `/llms.txt` provided for GEO/AEO agents. |

---

## 💻 CLI & Code Review Quick Reference

```bash
# Audit project & export SARIF to GitHub Security Tab
npx seo-gravity-mcp audit --project ./app --format sarif --output results.sarif

# Check regressions against project policy (.seo-gravity.yml) & output PR comment
npx seo-gravity-mcp check --project ./app --baseline baseline.json --format pr-comment

# Targeted SEO Code Review on modified Git routes
npx seo-gravity-mcp review --project ./app --base-ref origin/main --format pr-comment --output pr-comment.md
```

---

## 🛠️ Complete Tool Catalog (35 Tools)

| Operational Layer | Tools |
| :--- | :--- |
| **0. Agent Orchestration & Remediation** | `seo_project_audit`, `seo_diagnose`, `seo_prioritize`, `seo_fix_plan`, `seo_snapshot_create`, `seo_snapshot_compare`, `seo_regression_check` |
| **1. Competitor & SERP** | `seo_serp_analyze`, `seo_competitor_content_gap`, `seo_competitor_profile`, `seo_competitor_diff`, `seo_forum_discussions_pulse` |
| **2. GEO & AI Search (AEO)** | `seo_geo_ai_readiness_audit`, `seo_llms_txt_generate`, `seo_ai_bots_robots_audit` |
| **3. Info Gain & E-E-A-T** | `seo_information_gain_score`, `seo_eeat_audit` |
| **4. On-Page Content** | `seo_onpage_audit`, `seo_content_brief_generate`, `seo_readability_score` |
| **5. Technical & JS SEO** | `seo_technical_audit`, `seo_js_rendering_diff`, `seo_robots_txt_validate`, `seo_sitemap_inspect`, `seo_internal_links_analyze` |
| **6. Keywords & Intent** | `seo_keyword_suggestions`, `seo_questions_find`, `seo_keyword_cluster`, `seo_search_intent_classify` |
| **7. Entity & Schema** | `seo_entity_salience_map`, `seo_schema_generate`, `seo_schema_validate` |
| **8. Speed & Maintenance** | `seo_pagespeed_audit`, `seo_indexnow_submit`, `seo_content_decay_audit` |
