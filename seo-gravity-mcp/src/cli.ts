#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { auditProject, checkRegression, createSnapshotTool } from './tools/orchestration.js';
import { runDifferentialAudit } from './utils/gitDiffEngine.js';

async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const projectDir = getArg('--project') || getArg('-p') || '.';
  const baseUrl = getArg('--base-url') || getArg('-u');
  const baselinePath = getArg('--baseline') || getArg('-b');
  const outPath = getArg('--output') || getArg('-o');
  const baseRef = getArg('--base-ref') || 'HEAD~1';

  console.log(`\n🚀 SEO Gravity CLI (v1.1.0) — Engineering Layer for AI Coding\n`);

  switch (command) {
    case 'audit': {
      console.log(`Auditing project at: ${path.resolve(projectDir)}...`);
      const result = await auditProject(projectDir, baseUrl);
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
      process.exit(0);
      break;
    }

    case 'snapshot': {
      console.log(`Creating baseline snapshot for: ${path.resolve(projectDir)}...`);
      const snap = await createSnapshotTool(projectDir, baseUrl, outPath || 'seo-snapshot.json');
      console.log(`✅ Snapshot saved to: ${snap.savedToPath}`);
      console.log(`Score: ${snap.snapshot.scores.overallHealth}/100 | Findings: ${snap.snapshot.findings.length}`);
      process.exit(0);
      break;
    }

    case 'check': {
      if (!baselinePath) {
        console.error('❌ Error: --baseline <path_to_snapshot.json> is required for check command.');
        process.exit(1);
      }
      console.log(`Running CI Regression Check against: ${baselinePath}...`);
      const checkRes = await checkRegression(projectDir, baselinePath, baseUrl);
      console.log(`\n${checkRes.verdict}\n`);
      console.log(`Resolved: ${checkRes.regressionReport.totalResolvedCount} | Regressions: ${checkRes.regressionReport.totalNewRegressionsCount}`);

      if (checkRes.regressionReport.alerts.length > 0) {
        console.log(`\nAlerts:`);
        for (const a of checkRes.regressionReport.alerts) {
          console.log(`  ${a}`);
        }
      }

      process.exit(checkRes.pass ? 0 : 1);
      break;
    }

    case 'diff': {
      console.log(`Running Git Differential Audit against ${baseRef}...`);
      const diffRes = await runDifferentialAudit(projectDir, baseRef, baseUrl);
      console.log(`\n${diffRes.summary}\n`);
      if (diffRes.targetedFindings.length > 0) {
        console.log(`Targeted Findings on Changed Routes:`);
        for (const f of diffRes.targetedFindings) {
          console.log(`  [${f.severity.toUpperCase()}] ${f.title} -> ${f.affectedUrl}`);
        }
      }
      process.exit(diffRes.regressionDetected ? 1 : 0);
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Available commands: audit, snapshot, check, diff`);
      process.exit(1);
  }
}

runCli().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
