#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { auditProject, checkRegression, createSnapshotTool } from './tools/orchestration.js';
import { runDifferentialAudit } from './utils/gitDiffEngine.js';
import { exportFindingsToSarif } from './utils/sarifExporter.js';

export const EXIT_CODES = {
  PASS: 0,
  REGRESSION: 1,
  CONFIG_ERROR: 2,
  ANALYZER_FAILURE: 3,
  PARTIAL_UNKNOWN: 4
};

async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';

  const getArg = (flag: string, alias?: string): string | undefined => {
    let idx = args.indexOf(flag);
    if (idx === -1 && alias) idx = args.indexOf(alias);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const projectDir = getArg('--project', '-p') || '.';
  const baseUrl = getArg('--base-url', '-u');
  const baselinePath = getArg('--baseline', '-b');
  const outPath = getArg('--output', '-o');
  const baseRef = getArg('--base-ref') || 'HEAD~1';
  const format = (getArg('--format', '-f') || 'pretty').toLowerCase();

  try {
    switch (command) {
      case 'audit': {
        const result = await auditProject(projectDir, baseUrl);

        if (format === 'sarif') {
          const sarif = exportFindingsToSarif(result.topPriorityFindings, projectDir);
          const serialized = JSON.stringify(sarif, null, 2);
          if (outPath) {
            fs.writeFileSync(path.resolve(outPath), serialized, 'utf-8');
            console.error(`SARIF report written to ${outPath}`);
          } else {
            console.log(serialized);
          }
        } else if (format === 'json') {
          const serialized = JSON.stringify(result, null, 2);
          if (outPath) {
            fs.writeFileSync(path.resolve(outPath), serialized, 'utf-8');
            console.error(`JSON audit written to ${outPath}`);
          } else {
            console.log(serialized);
          }
        } else {
          // Pretty format
          console.log(`\n🚀 SEO Gravity CLI (v1.2.0) — SEO Infrastructure Layer\n`);
          console.log(`Auditing project at: ${path.resolve(projectDir)}...`);
          console.log(`\n========================================`);
          console.log(`Framework: ${result.framework.name} (${result.framework.framework})`);
          console.log(`Overall Health Score: ${result.scores.overallHealth}/100 (Confidence: ${result.scores.overallConfidence})`);
          console.log(`Discovered Routes: ${result.routesSummary.totalDiscovered} (${result.routesSummary.dynamicRoutesCount} dynamic)`);
          console.log(`Total Findings: ${result.totalFindingsCount}`);
          console.log(`========================================\n`);

          console.log(`Scores Breakdown:`);
          console.log(`- Technical:       ${result.scores.technical.score}/100 (${result.scores.technical.state})`);
          console.log(`- Content:         ${result.scores.content.score}/100 (${result.scores.content.state})`);
          console.log(`- Discoverability: ${result.scores.discoverability.score}/100 (${result.scores.discoverability.state})`);
          console.log(`- AI Readiness:    ${result.scores.aiReadiness.score}/100 (${result.scores.aiReadiness.state})`);
          console.log(`- Entity:          ${result.scores.entity.score}/100 (${result.scores.entity.state})\n`);

          if (result.topPriorityFindings.length > 0) {
            console.log(`Top Priority Findings:`);
            for (const f of result.topPriorityFindings.slice(0, 5)) {
              console.log(`  [${f.severity.toUpperCase()}] ${f.title} (Priority: ${f.priorityScore}) -> ${f.affectedUrl}`);
            }
          }

          console.log(`\nAction: ${result.recommendedImmediateAction}\n`);
          if (outPath) {
            fs.writeFileSync(path.resolve(outPath), JSON.stringify(result, null, 2), 'utf-8');
            console.log(`Audit saved to ${outPath}`);
          }
        }
        process.exit(EXIT_CODES.PASS);
        break;
      }

      case 'snapshot': {
        const snap = await createSnapshotTool(projectDir, baseUrl, outPath || 'seo-snapshot.json');
        if (format === 'json') {
          console.log(JSON.stringify(snap.snapshot, null, 2));
        } else {
          console.log(`\n🚀 SEO Gravity CLI (v1.2.0)\n`);
          console.log(`✅ Snapshot created and saved to: ${snap.savedToPath}`);
          console.log(`Score: ${snap.snapshot.scores.overallHealth}/100 | Invariants: ${snap.snapshot.invariants?.length || 0}`);
        }
        process.exit(EXIT_CODES.PASS);
        break;
      }

      case 'check': {
        if (!baselinePath) {
          console.error('❌ Configuration Error: --baseline <path_to_snapshot.json> is required for check command.');
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }

        const checkRes = await checkRegression(projectDir, baselinePath, baseUrl);

        if (format === 'sarif') {
          const sarif = exportFindingsToSarif(checkRes.regressionReport.newRegressions, projectDir);
          const serialized = JSON.stringify(sarif, null, 2);
          if (outPath) fs.writeFileSync(path.resolve(outPath), serialized, 'utf-8');
          else console.log(serialized);
        } else if (format === 'json') {
          const serialized = JSON.stringify(checkRes, null, 2);
          if (outPath) fs.writeFileSync(path.resolve(outPath), serialized, 'utf-8');
          else console.log(serialized);
        } else {
          console.log(`\n🚀 SEO Gravity CI Regression Check\n`);
          console.log(checkRes.verdict);
          console.log(`Resolved: ${checkRes.regressionReport.totalResolvedCount} | Regressions: ${checkRes.regressionReport.totalNewRegressionsCount}\n`);

          if (checkRes.regressionReport.alerts.length > 0) {
            console.log(`Alerts:`);
            for (const a of checkRes.regressionReport.alerts) {
              console.log(`  ${a}`);
            }
          }
        }

        process.exit(checkRes.pass ? EXIT_CODES.PASS : EXIT_CODES.REGRESSION);
        break;
      }

      case 'diff': {
        const diffRes = await runDifferentialAudit(projectDir, baseRef, baseUrl);

        if (format === 'json') {
          console.log(JSON.stringify(diffRes, null, 2));
        } else {
          console.log(`\n🚀 SEO Gravity Git Differential Audit\n`);
          console.log(diffRes.summary);
          if (diffRes.targetedFindings.length > 0) {
            console.log(`\nTargeted Findings on Changed Routes:`);
            for (const f of diffRes.targetedFindings) {
              console.log(`  [${f.severity.toUpperCase()}] ${f.title} -> ${f.affectedUrl}`);
            }
          }
        }

        process.exit(diffRes.regressionDetected ? EXIT_CODES.REGRESSION : EXIT_CODES.PASS);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error(`Available commands: audit, snapshot, check, diff`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
    }
  } catch (err: any) {
    console.error('Fatal CLI Analyzer Error:', err.message);
    process.exit(EXIT_CODES.ANALYZER_FAILURE);
  }
}

runCli();
