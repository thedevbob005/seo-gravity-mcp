import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { ASTSourceRange } from '../types/findings.js';

export interface ASTMetadataInspection {
  hasMetadataExport: boolean;
  hasGenerateMetadata: boolean;
  hasCanonicalDeclaration: boolean;
  hasSchemaMarkup: boolean;
  detectionMethod: 'ast_exact' | 'regex_heuristic';
  confidence: number;
  metadataRange?: ASTSourceRange;
  canonicalRange?: ASTSourceRange;
  schemaRange?: ASTSourceRange;
  extractedTitle?: string;
  extractedDescription?: string;
  extractedCanonical?: string;
}

export function inspectSourceFileAST(filePath: string): ASTMetadataInspection {
  if (!fs.existsSync(filePath)) {
    return {
      hasMetadataExport: false,
      hasGenerateMetadata: false,
      hasCanonicalDeclaration: false,
      hasSchemaMarkup: false,
      detectionMethod: 'ast_exact',
      confidence: 1.0
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  let hasMetadataExport = false;
  let hasGenerateMetadata = false;
  let hasCanonicalDeclaration = false;
  let hasSchemaMarkup = false;
  let metadataRange: ASTSourceRange | undefined;
  let canonicalRange: ASTSourceRange | undefined;
  let schemaRange: ASTSourceRange | undefined;
  let extractedTitle: string | undefined;
  let extractedDescription: string | undefined;
  let extractedCanonical: string | undefined;

  const getRange = (node: ts.Node, exportName?: string): ASTSourceRange => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return {
      filePath,
      startLine: start.line + 1,
      endLine: end.line + 1,
      startColumn: start.character + 1,
      endColumn: end.character + 1,
      astNodeType: ts.SyntaxKind[node.kind],
      exportName,
      snippet: node.getText(sourceFile).slice(0, 300)
    };
  };

  const visit = (node: ts.Node) => {
    // 1. Check for `export const metadata = { ... }`
    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === 'metadata') {
            hasMetadataExport = true;
            metadataRange = getRange(node, 'metadata');

            if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
              for (const prop of decl.initializer.properties) {
                if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                  if (prop.name.text === 'title') {
                    extractedTitle = prop.initializer.getText(sourceFile).replace(/['"]/g, '');
                  }
                  if (prop.name.text === 'description') {
                    extractedDescription = prop.initializer.getText(sourceFile).replace(/['"]/g, '');
                  }
                  if (prop.name.text === 'alternates' && ts.isObjectLiteralExpression(prop.initializer)) {
                    hasCanonicalDeclaration = true;
                    canonicalRange = getRange(prop, 'alternates.canonical');
                    for (const altProp of prop.initializer.properties) {
                      if (ts.isPropertyAssignment(altProp) && ts.isIdentifier(altProp.name) && altProp.name.text === 'canonical') {
                        extractedCanonical = altProp.initializer.getText(sourceFile).replace(/['"]/g, '');
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Check for `export async function generateMetadata(...)` or `export function generateMetadata(...)`
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'generateMetadata') {
      const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        hasGenerateMetadata = true;
        metadataRange = getRange(node, 'generateMetadata');
      }
    }

    // 3. Check for JSX <link rel="canonical" href="..." />
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (tagName === 'link') {
        const text = node.getText(sourceFile);
        if (text.includes('rel="canonical"') || text.includes("rel='canonical'")) {
          hasCanonicalDeclaration = true;
          canonicalRange = getRange(node, 'link:canonical');
          const hrefMatch = text.match(/href=["']([^"']+)["']/);
          if (hrefMatch) extractedCanonical = hrefMatch[1];
        }
      }

      // Check for <script type="application/ld+json">
      if (tagName === 'script') {
        const text = node.getText(sourceFile);
        if (text.includes('application/ld+json')) {
          hasSchemaMarkup = true;
          schemaRange = getRange(node, 'schema:jsonld');
        }
      }
    }

    // Fallback search for string literal indicators
    if (ts.isStringLiteral(node) && node.text.includes('application/ld+json')) {
      hasSchemaMarkup = true;
      if (!schemaRange) schemaRange = getRange(node, 'schema:jsonld');
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  let regexFallbackUsed = false;

  // Strict fallback regex detection if AST missed non-standard export structures
  if (!hasMetadataExport && /export\s+const\s+metadata\b/i.test(content)) {
    hasMetadataExport = true;
    regexFallbackUsed = true;
  }
  if (!hasGenerateMetadata && /export\s+(async\s+)?function\s+generateMetadata\b/i.test(content)) {
    hasGenerateMetadata = true;
    regexFallbackUsed = true;
  }
  if (!hasCanonicalDeclaration && (/(rel=["']canonical["']|alternates:\s*\{[^}]*canonical:)/i.test(content))) {
    hasCanonicalDeclaration = true;
    regexFallbackUsed = true;
  }
  if (!hasSchemaMarkup && /application\/ld\+json/i.test(content)) {
    hasSchemaMarkup = true;
    regexFallbackUsed = true;
  }

  return {
    hasMetadataExport,
    hasGenerateMetadata,
    hasCanonicalDeclaration,
    hasSchemaMarkup,
    detectionMethod: regexFallbackUsed ? 'regex_heuristic' : 'ast_exact',
    confidence: regexFallbackUsed ? 0.85 : 1.0,
    metadataRange,
    canonicalRange,
    schemaRange,
    extractedTitle,
    extractedDescription,
    extractedCanonical
  };
}
