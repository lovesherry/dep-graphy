import { SourceFile } from 'ts-morph';
import path from 'path';
import { AnalyzedDependencyNode } from '../types';
import { resolveImportModulePath } from './resolveImportModulePath';
import { shouldIgnore } from '../utils/compressIgnore';
import { getOrAddSourceFile } from '../utils/getOrAddSourceFile';
import { resolveSymbolType } from '../utils/resolveSymbolType';

/**
 * 解析指定文件的所有导入和导出依赖，构建 AnalyzedDependencyNode 列表
 */
export function resolveReactDependencies(
  sourceFile: SourceFile,
  importerPath: string
): AnalyzedDependencyNode[] {
  const dependencies: AnalyzedDependencyNode[] = [];
  const project = sourceFile.getProject();

  /**
   * 处理单个模块导入
   */
  const handleImport = (
    moduleSpecifier: string,
    importedNames: string[]
  ): void => {
    const resolvedPath = resolveImportModulePath(moduleSpecifier, importerPath);

    if (!resolvedPath || shouldIgnore(resolvedPath)) {
      dependencies.push({
        name: importedNames.join(', '),
        type: 'ignored',
        filePath: resolvedPath ?? moduleSpecifier,
        deps: [],
      });
      return;
    }

    if (resolvedPath.startsWith('__EXTERNAL__::')) {
      const pkgName = resolvedPath.split('::')[1];
      dependencies.push({
        name: importedNames.join(', '),
        type: 'external',
        filePath: pkgName,
        deps: [],
      });
      return;
    }

    const relPath = path.relative(process.cwd(), resolvedPath);
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

  // 普通 import
  for (const importDecl of sourceFile.getImportDeclarations()) {
    if (importDecl.isTypeOnly()) continue;

    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const names: string[] = [];

    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      names.push(defaultImport.getText());
    }

    for (const namedImport of importDecl.getNamedImports()) {
      names.push(namedImport.getName());
    }

    const nsImport = importDecl.getNamespaceImport();
    if (nsImport) {
      names.push(nsImport.getText());
    }

    if (names.length > 0) {
      handleImport(moduleSpecifier, names);
    }
  }

  // export from
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const names = exportDecl.isNamespaceExport()
      ? ['*']
      : exportDecl.getNamedExports().map((e) => e.getName()) || ['*'];

    handleImport(moduleSpecifier, names);
  }

  return dependencies;
}
