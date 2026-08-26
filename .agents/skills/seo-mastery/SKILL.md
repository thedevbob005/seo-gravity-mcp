---
name: seo-mastery
description: >-
  Expert SEO & Generative Engine Optimization (GEO) strategist, code correlator, and technical remediation engine.
  Use when discovering project routes, diagnosing root-cause SEO issues in code (Next.js, Astro, Vite, Remix),
  ranking findings by (Impact x Reach)/Effort, executing code fixes, verifying regression diffs, mapping entities,
  generating Schema.org JSON-LD, or optimizing for AI Overviews & Perplexity.
---

# 🚀 SEO & GEO Mastery Guide for Antigravity (v1.0.2)

This skill teaches the agent how to autonomously orchestrate the **SEO Gravity MCP** engine (35 tools across 9 operational layers) to understand, audit, fix, and continuously verify website SEO with **zero regressions**.

---

## 🎯 The 5-Stage Autonomous Remediation Loop

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │ 1. DISCOVER  │ ──▶ │  2. OBSERVE  │ ──▶ │ 3. DIAGNOSE  │ ──▶ │    4. FIX    │ ──▶ │  5. VERIFY   │
 │ Framework    │     │ Live/Dev SSR │     │ Root Causes  │     │ AI Modifies  │     │ Re-crawl &   │
 │ Routes       │     │ SERP & Comp. │     │ Prioritized  │     │ Source Code  │     │ Regression   │
 │ Source Map   │     │ Crawl Graph  │     │ Action Plan  │     │ Components   │     │ Diff Check   │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Stage 1: Discover & Project Inspection
When tasked with evaluating or optimizing a project codebase:
1. Call `seo_project_audit` with `project_path` (e.g. `.` or `d:/aide/my-app`) and optional `base_url` (`http://localhost:3000`).
2. Inspect discovered routes, framework architecture (Next.js App/Pages router, Astro, Vite, Remix, SvelteKit), and initial multidimensional health scores.
3. Call `seo_snapshot_create` to record a baseline snapshot before making code changes.

### Stage 2: Observe Live & Competitor Signals
1. For live or local server verification, call `seo_js_rendering_diff` to detect client-only content or flash-of-unstyled-meta.
2. Call `seo_serp_analyze` and `seo_competitor_content_gap` to retrieve top-ranking competitor entities and heading coverage gaps.
3. Call `seo_forum_discussions_pulse` to pull real-world user intent and Reddit/Quora search sentiments.

### Stage 3: Diagnose & Prioritize
1. Call `seo_diagnose` on high-priority routes (e.g. `/blog/[slug]`) to correlate observed issues with exact source files and line numbers.
2. Call `seo_prioritize` to group findings into **Quick Wins** (low effort, high impact), **Critical Blockers**, and **Architectural Improvements**.
3. Call `seo_fix_plan` to generate a structured implementation blueprint with code snippets.

### Stage 4: Code Remediation
1. Apply the suggested code snippets to target source files (e.g. adding `generateMetadata()` or `alternates.canonical` in Next.js, or JSON-LD schema components).
2. Generate `/llms.txt` using `seo_llms_txt_generate` if missing.
3. Verify robots directives using `seo_ai_bots_robots_audit` to ensure AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`) are permitted.

### Stage 5: Verification & Regression Gate
1. Re-run `seo_regression_check` against the baseline snapshot.
2. Verify that:
   - `status` is `IMPROVEMENTS_ONLY` or `NO_REGRESSION`.
   - `newRegressions` is empty.
   - Multidimensional health scores have improved.

---

## 🛠️ Tool Quick Reference (35 Tools)

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
