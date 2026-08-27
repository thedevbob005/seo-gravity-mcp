import { RegressionReport } from '../types/findings.js';
import { InvariantDiffItem } from '../types/canonical.js';
import { PolicyConfig } from '../policy/types.js';

export function formatPrCommentMarkdown(
  report: RegressionReport,
  policy: PolicyConfig,
  gitRef?: string
): string {
  const newRegressions = report.newRegressions || [];
  const resolved = report.resolvedFindings || [];
  const invariantDiffs = report.invariantDiffs || [];
  const isPassed = report.status === 'NO_REGRESSION' || report.status === 'IMPROVEMENTS_ONLY';

  const statusBadge = isPassed
    ? '![SEO Quality Gate](https://img.shields.io/badge/SEO_Quality_Gate-PASSED-brightgreen?style=for-the-badge)'
    : '![SEO Quality Gate](https://img.shields.io/badge/SEO_Quality_Gate-REGRESSION_FAILED-critical?style=for-the-badge)';

  let md = `## 🛡️ SEO Gravity Quality Gate Report\n\n`;
  md += `${statusBadge}\n\n`;

  if (gitRef) {
    md += `> **Git Ref**: \`${gitRef}\` | **Policy Profile**: \`${policy.profile}\`\n\n`;
  } else {
    md += `> **Policy Profile**: \`${policy.profile}\`\n\n`;
  }

  // Summary Table
  md += `### 📊 SEO Invariant Summary\n\n`;
  md += `| Metric | Count | Status |\n`;
  md += `| :--- | :---: | :--- |\n`;
  md += `| **Invariant Regressions** | **\`${newRegressions.length}\`** | ${newRegressions.length === 0 ? '🟢 None' : '🔴 Requires Action'} |\n`;
  md += `| **Resolved Findings** | **\`${resolved.length}\`** | ${resolved.length > 0 ? '🎉 Fixed' : '⚪ None'} |\n`;
  md += `| **Total Invariant Checks** | **\`${invariantDiffs.length}\`** | 🟢 Tracked |\n`;
  md += `| **Overall Score Delta** | **\`${report.overallScoreDelta >= 0 ? '+' : ''}${report.overallScoreDelta}\`** | ${report.overallScoreDelta >= 0 ? '🟢 Stable/Improved' : '🟡 Score Delta'} |\n\n`;

  // Regression Details Table
  if (newRegressions.length > 0) {
    md += `### 🔴 Invariant Regressions Detected\n\n`;
    md += `| Finding | Severity | Category | Affected URL | Source Location |\n`;
    md += `| :--- | :---: | :---: | :--- | :--- |\n`;
    for (const reg of newRegressions) {
      const src = reg.sourceLocation
        ? `\`${reg.sourceLocation.filePath}:${reg.sourceLocation.startLine || 1}\``
        : '`Project Root`';
      md += `| **\`${reg.title}\`** | \`${reg.severity}\` | \`${reg.category}\` | \`${reg.affectedUrl}\` | ${src} |\n`;
    }
    md += `\n> [!CAUTION]\n> **Action Required**: Resolve the invariant regressions above to satisfy the CI PR gate.\n\n`;
  } else {
    md += `> [!TIP]\n> **All critical SEO invariants satisfied**: No regressions were introduced in this commit.\n\n`;
  }

  // Invariant Diffs (if any broken invariants)
  const brokenInvs = invariantDiffs.filter(i => i.status === 'NEW_REGRESSION');
  if (brokenInvs.length > 0) {
    md += `### ⚠️ Invariant Violations\n\n`;
    md += `| Invariant ID | Level | URL | Message |\n`;
    md += `| :--- | :---: | :--- | :--- |\n`;
    for (const inv of brokenInvs) {
      md += `| **\`${inv.invariantId}\`** | \`${inv.requirementLevel || 'REQUIRED'}\` | \`${inv.url}\` | ${inv.message} |\n`;
    }
    md += `\n`;
  }

  // Resolved Findings
  if (resolved.length > 0) {
    md += `### 🟢 Resolved Invariants & Improvements\n\n`;
    for (const r of resolved) {
      md += `- ✅ **\`${r.title}\`** on \`${r.affectedUrl}\` was resolved.\n`;
    }
    md += `\n`;
  }

  md += `---\n`;
  md += `*Generated automatically by [SEO Gravity MCP](https://github.com/thedevnaamnei/seo-gravity-mcp) • The SEO Engineering Infrastructure Layer for AI Coding Agents & CI/CD Pipelines.*`;

  return md;
}
