---
name: seo-mastery
description: >-
  Expert SEO & Generative Engine Optimization (GEO) strategist and technical auditor.
  Use when analyzing competitor search rankings, optimizing on-page content, reverse-engineering
  SERPs, writing data-backed content briefs, auditing JavaScript SEO hydration, mapping entities,
  generating Schema.org JSON-LD, or optimizing for AI Overviews & Perplexity.
---

# 🚀 SEO & GEO Mastery Guide for Antigravity

This skill teaches the agent how to autonomously orchestrate the **SEO Gravity MCP** tool suite (28 tools across 8 pillars) to achieve dominant search engine and AI search engine visibility.

---

## 🎯 Core Autonomous Workflows

### 1. Competitor Reverse-Engineering & Content Gap Analysis
When tasked with researching a keyword or outranking competitors:
1. Call `seo_serp_analyze` with the target query to retrieve the current top 10 organic ranking URLs, People Also Ask (PAA) questions, and SERP features.
2. Call `seo_forum_discussions_pulse` to understand real-world user complaints and opinions from Reddit/Quora ranking threads.
3. Call `seo_competitor_content_gap` comparing the user's page (or draft text) against the top 3 competitor URLs to extract:
   - Missing TF-IDF entities and high-salience terms.
   - Subtopic and heading gaps (H2/H3s).
   - Word count and content depth deltas.
4. Call `seo_competitor_diff` to run a 25-factor side-by-side benchmark against the #1 competitor.

### 2. GEO (Generative Engine Optimization) & AI Overview Optimization
To ensure the website is cited by Google AI Overviews, Perplexity.ai, and ChatGPT Search:
1. Call `seo_geo_ai_readiness_audit` on the target page/draft.
2. Ensure the first 100 words include a clear, bold definition answering the core search intent.
3. Add structured bullet points and comparison tables for LLM digestion.
4. Call `seo_llms_txt_generate` to build `/llms.txt` and `/llms-full.txt` files for AI search bots.
5. Verify `seo_ai_bots_robots_audit` to ensure `GPTBot`, `ClaudeBot`, and `PerplexityBot` are allowed.

### 3. Information Gain & E-E-A-T Fortification
To avoid Google's helpful content / AI rehash penalties:
1. Call `seo_information_gain_score` to verify that the page introduces unique statistics, case studies, or first-hand experience not present in top 10 SERPs.
2. Call `seo_eeat_audit` to check:
   - Schema `Person` author markup with `sameAs` LinkedIn/Wikidata references.
   - Fact-checking disclaimers and visible `dateModified` timestamps.

### 4. Technical SEO & JavaScript Hydration Health Check
1. Call `seo_technical_audit` to check status codes, canonicals, meta robots (`noindex` leaks), and SSL.
2. Call `seo_js_rendering_diff` on Next.js/React/Vite apps to compare initial server HTML against the hydrated DOM and identify JS-dependent links or flash-of-unstyled-meta.
3. Call `seo_robots_txt_validate` and `seo_sitemap_inspect` to verify crawler accessibility.

### 5. Schema.org Markup Generation & Validation
1. Call `seo_entity_salience_map` to extract named entities and Subject-Predicate-Object (SPO) relationship triples.
2. Call `seo_schema_generate` with the appropriate type (`Article`, `FAQPage`, `Product`, `LocalBusiness`, `BreadcrumbList`).
3. Validate the output with `seo_schema_validate` before injecting into the application.

---

## 🛠️ Tool Quick Reference (28 Tools)

| Pillar | Tools |
| :--- | :--- |
| **1. Competitor & SERP** | `seo_serp_analyze`, `seo_competitor_content_gap`, `seo_competitor_profile`, `seo_competitor_diff`, `seo_forum_discussions_pulse` |
| **2. GEO & AI Search** | `seo_geo_ai_readiness_audit`, `seo_llms_txt_generate`, `seo_ai_bots_robots_audit` |
| **3. Info Gain & E-E-A-T** | `seo_information_gain_score`, `seo_eeat_audit` |
| **4. On-Page Content** | `seo_onpage_audit`, `seo_content_brief_generate`, `seo_readability_score` |
| **5. Technical & JS SEO** | `seo_technical_audit`, `seo_js_rendering_diff`, `seo_robots_txt_validate`, `seo_sitemap_inspect`, `seo_internal_links_analyze` |
| **6. Keywords & Intent** | `seo_keyword_suggestions`, `seo_questions_find`, `seo_keyword_cluster`, `seo_search_intent_classify` |
| **7. Entity & Schema** | `seo_entity_salience_map`, `seo_schema_generate`, `seo_schema_validate` |
| **8. Speed & Maintenance**| `seo_pagespeed_audit`, `seo_indexnow_submit`, `seo_content_decay_audit` |
