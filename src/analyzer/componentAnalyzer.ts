import { Project, SourceFile } from 'ts-morph';
import path from 'path';
import { AnalyzedDependencyNode, FrameworkType } from '../types';
import { resolveReactDependencies } from '../resolvers/resolveReactDependencies';
import { resolveVueDependencies } from '../resolvers/resolveVueDependencies';
import { getRelativePath } from '../utils/pathClassifier';

export async function analyzeComponentEntry(entryPath: string, framework: FrameworkType): Promise<AnalyzedDependencyNode> {

  let resolver: ((sourceFile: SourceFile, absPath: string) => AnalyzedDependencyNode[]) | null = null;

  if (framework === 'vue') {
    resolver = resolveVueDependencies;
  } else if (framework === 'next' || framework === 'react' || framework === 'taro') {
    resolver = resolveReactDependencies;
  }

  const project = new Project({
    tsConfigFilePath: path.resolve('tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const visited = new Set<string>();

  async function walk(filePath: string, type: AnalyzedDependencyNode['type']): Promise<AnalyzedDependencyNode> {
    const absPath = path.resolve(filePath);
    const relPath = getRelativePath(absPath);

    if (visited.has(absPath)) {
      return {
        name: path.basename(absPath),
        type,
        filePath: relPath,
        deps: [],
      };
    }
    visited.add(absPath);

    let sourceFile: SourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(absPath);
    } catch {
      return {
        name: path.basename(absPath),
        type: 'unknown',
        filePath: relPath,
        deps: [],
      };
    }

    const imports = resolver ? resolver(sourceFile, absPath) : [];
    const deps: AnalyzedDependencyNode[] = [];

    for (const imp of imports) {
      const relDepPath = imp.filePath ? getRelativePath(imp.filePath) : '';
      if (imp.filePath && ['component', 'hook', 'function', 'const'].includes(imp.type)) {
        const child = await walk(imp.filePath, imp.type);
        deps.push({
          ...child,
          name: imp.name,
          filePath: relDepPath,
        });
      } else {
        deps.push({
          name: imp.name,
          type: imp.type,
          filePath: relDepPath,
          deps: [],
        });
      }
    }

    return {
      name: path.basename(absPath),
      type,
      filePath: relPath,
      deps,
    };
  }

  return await walk(entryPath, 'entry');
}