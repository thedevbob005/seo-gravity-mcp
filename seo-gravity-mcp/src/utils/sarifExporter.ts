import { Finding, ProjectSnapshot, InvariantDiffItem } from '../types/findings.js';

export interface SarifPhysicalLocation {
  artifactLocation: {
    uri: string;
    uriBaseId?: string;
  };
  region?: {
    startLine: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
    snippet?: {
      text: string;
    };
  };
}

export interface SarifResult {
  ruleId: string;
  ruleIndex?: number;
  level: 'error' | 'warning' | 'note' | 'none';
  message: {
    text: string;
  };
  locations?: Array<{
    physicalLocation: SarifPhysicalLocation;
  }>;
  fixes?: Array<{
    description: { text: string };
  }>;
}

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  help?: { text: string };
  defaultConfiguration: {
    level: 'error' | 'warning' | 'note';
  };
}

export interface SarifReport {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

export function exportFindingsToSarif(
  findings: Finding[],
  projectRootDir = '.',
  toolVersion = '1.2.0'
): SarifReport {
  const ruleMap = new Map<string, SarifRule>();
  const results: SarifResult[] = [];

  const mapSeverityToSarifLevel = (sev: Finding['severity']): 'error' | 'warning' | 'note' => {
    switch (sev) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
      default:
        return 'note';
    }
  };

  for (const f of findings) {
    if (!ruleMap.has(f.id)) {
      ruleMap.set(f.id, {
        id: f.id,
        name: f.title.replace(/[^a-zA-Z0-9]/g, '_'),
        shortDescription: { text: f.title },
        fullDescription: { text: f.evidence },
        help: { text: `${f.recommendation} (Expected Impact: ${f.expectedImpact})` },
        defaultConfiguration: {
          level: mapSeverityToSarifLevel(f.severity)
        }
      });
    }

    const relPath = f.sourceLocation?.filePath || (f.affectedUrl.startsWith('/') ? f.affectedUrl.slice(1) : f.affectedUrl);
    const startLine = f.sourceRange?.startLine || f.sourceLocation?.startLine || f.sourceLocation?.line || 1;
    const endLine = f.sourceRange?.endLine || f.sourceLocation?.endLine || startLine;

    results.push({
      ruleId: f.id,
      level: mapSeverityToSarifLevel(f.severity),
      message: {
        text: `${f.title}: ${f.evidence}. ${f.recommendation}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: relPath.replace(/\\/g, '/')
            },
            region: {
              startLine,
              endLine,
              snippet: f.sourceRange?.snippet ? { text: f.sourceRange.snippet } : undefined
            }
          }
        }
      ],
      fixes: f.suggestedFix?.snippet
        ? [
            {
              description: {
                text: `${f.suggestedFix.explanation}\n\`\`\`\n${f.suggestedFix.snippet}\n\`\`\``
              }
            }
          ]
        : undefined
    });
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'SEO Gravity',
            version: toolVersion,
            informationUri: 'https://github.com/thedevbob005/seo-gravity-mcp',
            rules: Array.from(ruleMap.values())
          }
        },
        results
      }
    ]
  };
}
