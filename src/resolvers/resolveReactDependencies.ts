// resolvers/resolveReactDependencies.ts
import { SourceFile } from 'ts-morph';
import path from 'path';
import { AnalyzedDependencyNode } from '../types';
import { resolveImportModulePath } from './resolveImportModulePath';
import { shouldIgnore } from '../utils/compressIgnore';
import { getOrAddSourceFile } from '../utils/getOrAddSourceFile';

export function resolveReactDependencies(
  sourceFile: SourceFile,
  importerPath: string
): AnalyzedDependencyNode[] {
  const dependencies: AnalyzedDependencyNode[] = [];

  const handleImport = (
    moduleSpecifier: string,
    importedNames: string[],
  ) => {
    const resolvedPath = resolveImportModulePath(moduleSpecifier, importerPath);
    const relPath = resolvedPath ? path.relative(process.cwd(), resolvedPath) : moduleSpecifier;

    if (!resolvedPath || resolvedPath.includes('node_modules') || shouldIgnore(resolvedPath)) {
      const depType = classifyDependencyType(resolvedPath);
      dependencies.push({
        name: importedNames.join(', '),
        type: depType,
        filePath: relPath,
        deps: [],
      });
      return;
    }

    const project = sourceFile.getProject();
    const resolvedSourceFile = getOrAddSourceFile(project, resolvedPath);

    if (!resolvedSourceFile) {
      dependencies.push({
        name: moduleSpecifier,
        type: 'unknown',
        filePath: relPath,
        deps: [],
      });
      return;
    }

    for (const importedName of importedNames) {
      const type = resolveSymbolType(resolvedSourceFile, importedName);
      dependencies.push({
        name: importedName,
        type,
        filePath: relPath,
        deps: [],
      });
    }
  };

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    const defaultImport = importDecl.getDefaultImport()?.getText();
    if (defaultImport) {
      handleImport(moduleSpecifier, [defaultImport]);
    }

    const namedImports = importDecl.getNamedImports().map((i) => i.getName());
    if (namedImports.length > 0) {
      handleImport(moduleSpecifier, namedImports);
    }

    const nsImport = importDecl.getNamespaceImport();
    if (nsImport) {
      const name = nsImport.getText();
      handleImport(moduleSpecifier, [name]);
    }
  }

  for (const exportDecl of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (moduleSpecifier) {
      handleImport(moduleSpecifier, ['*']);
    }
  }

  return dependencies;
}

function classifyDependencyType(resolvedPath: string | null): AnalyzedDependencyNode['type'] {
  if (!resolvedPath) return 'unknown';
  if (shouldIgnore(resolvedPath)) return 'ignored';
  if (resolvedPath.includes('node_modules')) return 'external';
  return 'unknown'
}

function resolveSymbolType(
  resolvedSourceFile: SourceFile,
  importedName: string
): AnalyzedDependencyNode['type'] {
  const filePath = resolvedSourceFile.getFilePath();

  if (/\.(png|jpe?g|svg|gif|webp|bmp|ico)$/.test(filePath)) return 'media';
  if (/\.(scss|less|css|styl)$/.test(filePath)) return 'style';
  if (/\.(jsx|tsx)$/.test(filePath)) return 'component';
  if (/^use[A-Z]/.test(importedName)) return 'hook';

  const exportedSymbols = resolvedSourceFile.getExportSymbols();
  const matchedSymbol = exportedSymbols.find(
    (s) => s.getName() === importedName || s.getAliasedSymbol()?.getName() === importedName
  );

  const symbol = matchedSymbol?.getAliasedSymbol() || matchedSymbol;
  if (!symbol) return 'unknown';

  const declarations = symbol.getDeclarations();
  if (declarations.length === 0) return 'unknown';

  const decl = declarations[0];
  const kind = decl.getKindName();

  if (kind === 'VariableDeclaration') {
    const initializer = (decl as any).getInitializer?.();
    const text = initializer?.getText?.() || '';
    if (/React\.FC|React\.FunctionComponent/.test(text)) {
      return 'component';
    }
    return 'const';
  }

  switch (kind) {
    case 'EnumDeclaration':
      return 'enum';
    case 'InterfaceDeclaration':
      return 'interface';
    case 'TypeAliasDeclaration':
      return 'type';
    case 'FunctionDeclaration':
      return 'function';
    case 'ClassDeclaration':
      return 'component';
    default:
      return 'unknown';
  }
}