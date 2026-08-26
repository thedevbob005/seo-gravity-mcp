# 📜 SEO Gravity: Architectural Contract & System Specification

> **Version**: 1.3.1 | **Author**: `thedevbob005` | **Repository**: [`thedevbob005/seo-gravity-mcp`](https://github.com/thedevbob005/seo-gravity-mcp)

This document establishes the **formal engineering guarantees, layer boundary constraints, evidence semantics, invariant contracts, and benchmark methodology** governing the SEO Gravity architecture.

---

## 🏛 1. Architectural Layer Boundaries & Guarantees

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: AGENT & CLI INTERFACE                                              │
│ • Protocol dispatch (MCP JSON-RPC, CLI commands, SARIF & PR Comment format) │
│ ❌ MUST NOT execute AST parsing, HTTP requests, or scoring logic directly. │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: INTELLIGENCE & REASONING LAYER                                     │
│ • Root-cause diagnosis, priority ranking: (Impact × Reach) / Effort         │
│ • Remediation fix blueprints & sprint planning                              │
│ ❌ MUST NOT crawl web pages or access filesystem directly.                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: ANALYSIS, POLICY & INVARIANT LAYER                                 │
│ • Invariant evaluation, project policy enforcement (.seo-gravity.yml)       │
│ • Semantic Git diffing & snapshot regression engine                         │
│ ❌ MUST NOT alter observed factual states.                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: OBSERVATION LAYER (Factual Raw State)                              │
│ • Observations ≠ Findings; Page Identity Normalization (logicalPageId)      │
│ • AST Coordinate Locator, Template Parser, Crawl Graph Builder              │
│ ❌ MUST NOT make subjective judgments or assign severities.                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: PROVIDER & ADAPTER LAYER                                           │
│ • 17 Framework Adapters, Provider HTTP Clients, Content-Hash Cache Manager  │
│ ❌ MUST NOT interpret business rules or generate remediation plans.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 2. Evidence Semantics

Every observation and finding must carry typed **Polymorphic Evidence** specifying its provenance:

| Evidence Type | Interface | Payload Fields | Guaranteed Source |
| :--- | :--- | :--- | :--- |
| **`AstEvidence`** | `AstEvidence` | `sourceFile`, `symbolName`, `nodeType`, `startLine`, `endLine` | TypeScript / JavaScript Compiler AST |
| **`TemplateEvidence`** | `TemplateEvidence` | `sourceFile`, `templateEngine` (blade, twig, vue, svelte, astro), `blockName` | Template hierarchy parser |
| **`RouteConfigEvidence`** | `RouteConfigEvidence` | `sourceFile`, `configFormat` (`laravel_routes`, `symfony_yaml`, `next_app_dir`), `declaredPattern` | Route registration files |
| **`DomEvidence`** | `DomEvidence` | `selector`, `htmlSnippet`, `elementTag`, `attributeName` | Rendered SSR/CSR DOM trees |
| **`HeaderEvidence`** | `HeaderEvidence` | `statusCode`, `headerName`, `headerValue`, `rawHeaders` | Live / local HTTP response headers |
| **`RuntimeEvidence`** | `RuntimeEvidence` | `hookName`, `filterName`, `runtimeSource` (`wordpress_hook`, `php_output_buffer`) | Dynamic runtime injections |
| **`GitEvidence`** | `GitEvidence` | `baseCommit`, `headCommit`, `diffHunk`, `changedLinesCount`, `affectedSymbols` | Git porcelain diff engine |
| **`ExternalEvidence`** | `ExternalEvidence` | `providerName`, `endpointUrl`, `responsePayloadSummary` | External SERP / PageSpeed APIs |

---

## 🛡️ 3. Invariant Semantics & Truth Table

Invariants are deterministic assertions of SEO correctness. **Requirement levels are strictly decoupled from severity**:

### Requirement Levels
- **`REQUIRED`**: Absolute prerequisite for production readiness (e.g. HTTP 200, `<title>` present). Violations block CI gates in all policy profiles.
- **`CONDITIONAL`**: Mandatory only when specific conditions apply (e.g. canonical tag required *if and only if* page is indexable).
- **`RECOMMENDED`**: Best-practice optimization (e.g. `/llms.txt`, XML sitemaps). Generates recommendations/warnings, but does not block CI gates unless `strict` profile is configured.
- **`OPTIONAL`**: Advisory signals for advanced optimization.

### Invariant Catalog

| Invariant ID | Name | Scope | Requirement Level | Severity | Semantic Failure Condition |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`INV-HTTP-200`** | HTTP Success Status | Route | **`REQUIRED`** | Critical | Status code is 4xx, 5xx, or route unresolvable. |
| **`INV-CANONICAL-RESOLVES`** | Canonical URL Declaration | Page | **`CONDITIONAL`** | High | Indexable page lacks canonical URL declaration. |
| **`INV-TITLE-PRESENT`** | Title Tag Metadata | Page | **`REQUIRED`** | High | Component, template, or HTML lacks descriptive title. |
| **`INV-LINK-ACCESSIBLE`** | Link Reachability | Crawl Graph | **`CONDITIONAL`** | Medium | Public page has 0 internal inlinks (Orphan Page). |
| **`INV-ROBOTS-ALLOWED`** | Robots Policy Determinable | Site | **`CONDITIONAL`** | Medium | Bot directives are indeterminable or block assets. |
| **`INV-SITEMAP-PRESENT`** | XML Sitemap Configuration | Site | **`RECOMMENDED`** | Medium | Missing `sitemap.xml` or dynamic sitemap route. |
| **`INV-LLMS-TXT`** | AI Context Documentation | Site | **`RECOMMENDED`** | Low | Missing `/llms.txt` context file for AI crawlers. |

---

## ⚙️ 4. Policy Semantics (`.seo-gravity.yml`)

Projects define their policy profile in `.seo-gravity.yml`:

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

### Policy Profile Behavior Matrix
| Profile | Failing Requirement Levels | Failing Severities | Recommended Invariant Handling |
| :--- | :--- | :--- | :--- |
| **`strict`** | `REQUIRED`, `CONDITIONAL`, `RECOMMENDED` | `critical`, `high`, `medium`, `low` | Enforces `/llms.txt` and XML sitemaps as hard gates. |
| **`balanced`** | `REQUIRED`, `CONDITIONAL` | `critical`, `high` | Standard CI gate; recommended items reported as warnings. |
| **`startup`** | `REQUIRED` | `critical`, `high` | Velocity mode; focuses on HTTP 200 and basic titles. |
| **`ecommerce`** | `REQUIRED`, `CONDITIONAL` | `critical`, `high`, `medium` | Strict on canonicals, 404s, schema, and internal inlinks. |
| **`documentation`** | `REQUIRED`, `CONDITIONAL`, `RECOMMENDED` | `critical`, `high`, `medium` | Strict on sitemaps, orphan links, and `/llms.txt`. |

---

## 🔄 5. Regression Semantics & State Machine

Regression diffing compares baseline snapshot $S_{base}$ against current snapshot $S_{curr}$:

```text
               ┌──────────────────────┐
               │    Diff Snapshots    │
               └──────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                                 ▼
   New Regressions                 Resolved Findings
         │                                 │
  ┌──────┴──────┐                   ┌──────┴──────┐
  │ Count == 0? │                   │ Count > 0?  │
  └──────┬──────┘                   └──────┬──────┘
         │                                 │
  ┌──────┴─────────────────────────────────┴──────┐
  ▼                                               ▼
[NO_REGRESSION]                           [IMPROVEMENTS_ONLY]
[REGRESSION_DETECTED] (if new > 0, res = 0)
[MIXED_CHANGES]       (if new > 0, res > 0)
```

---

## 📊 6. Published Benchmark Methodology Matrix

### Definition of Correlation Accuracy
> **Correlation Accuracy** is defined as the verified 1-to-1 mapping connecting an observed URL or Route Pattern to its exact physical source file, template block, route configuration, and AST symbol coordinate range with zero human intervention.

```text
Framework Adapter          Fixtures   Routes   Test Cases   Correct Mappings   Accuracy
---------------------------------------------------------------------------------------
Next.js App Router            1          4         4              4             100%
Next.js Pages Router          1          2         2              2             100%
Astro                         1          1         1              1             100%
Vite React (SPA)              1          3         3              3             100%
Remix                         1          2         2              2             100%
SvelteKit                     1          1         1              1             100%
Nuxt 3                        1          2         2              2             100%
TanStack Start                1          2         2              2             100%
SolidStart                    1          1         1              1             100%
Qwik City                     1          2         2              2             100%
Gatsby                        1          1         1              1             100%
WordPress (Classic & FSE)     1          2         2              2             100%
Laravel (Blade)               1          3         3              3             100%
Symfony (Twig)                1          1         1              1             100%
Classic PHP                   1          2         2              2             100%
Markdown SSG (Hugo/11ty)      1          1         1              1             100%
Static HTML                   1          1         1              1             100%
---------------------------------------------------------------------------------------
TOTAL                        17         31        31             31             100%
```

### False-Positive & False-Negative Precision
- **False Positive Rate**: **`0.0%`** (Verified via `src/benchmark/falsePositiveBenchmark.ts`)
- **False Negative Rate**: **`0.0%`** (100% Recall on known SEO defects)
