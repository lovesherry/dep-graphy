import { SourceFile } from 'ts-morph';
import path from 'path';
import { AnalyzedDependencyNode } from '../types';

export function resolveSymbolType(
  sourceFile: SourceFile,
  importedName: string
): AnalyzedDependencyNode['type'] {
  const relativePath = path.relative(process.cwd(), sourceFile.getFilePath());

  if (/\.(png|jpe?g|svg|gif|webp|bmp|ico)$/.test(relativePath)) return 'media';
  if (/\.(scss|less|css|styl)$/.test(relativePath)) return 'style';

  const exportedSymbols = sourceFile.getExportSymbols();
  let matchedSymbol = exportedSymbols.find(
    (s) =>
      s.getName() === importedName ||
      s.getAliasedSymbol()?.getName() === importedName
  );

  if (!matchedSymbol) {
    const defaultExportSymbol = exportedSymbols.find(
      (s) => s.getName() === 'default'
    );
    if (defaultExportSymbol) {
      matchedSymbol = defaultExportSymbol;
    }
  }

  const symbol = matchedSymbol?.getAliasedSymbol() || matchedSymbol;
  if (!symbol)
    return fallbackType(sourceFile, importedName, 'symbol not found');

  const declarations = symbol.getDeclarations();
  if (declarations.length === 0)
    return fallbackType(sourceFile, importedName, 'no declarations');

  const decl = declarations[0];
  const kind = decl.getKindName();

  switch (kind) {
    case 'EnumDeclaration':
      return 'enum';
    case 'InterfaceDeclaration':
      return 'interface';
    case 'TypeAliasDeclaration':
      return 'type';
    case 'ClassDeclaration':
      return 'component';
    case 'VariableDeclaration':
      return handleVariableOrFuncImport(importedName, relativePath, 'const');
    case 'FunctionDeclaration':
      return handleVariableOrFuncImport(importedName, relativePath, 'function');
    default:
      return 'unknown';
  }
}

function fallbackType(
  sourceFile: SourceFile,
  importedName: string,
  reason: string
): AnalyzedDependencyNode['type'] {
  // const projectRoot = process.cwd();
  // const relativePath = path.relative(projectRoot, sourceFile.getFilePath());
  console.warn(`⚠️ Fallback type for "${importedName}" : ${reason}`);
  return 'unknown';
}

const handleVariableOrFuncImport = (
  importedName: string,
  relativePath: string,
  defaultType: 'const' | 'function' = 'const'
): AnalyzedDependencyNode['type'] => {
  if (/^[A-Z]/.test(importedName) && relativePath.endsWith('.tsx')) {
    return 'component';
  }
  if (/^use[A-Z]/.test(importedName)) {
    return 'hook';
  }
  return defaultType;
};
