import path from 'path';
import { Project, SourceFile } from 'ts-morph';
import { getProjectRoot } from '../utils/common';
import { resolveReactDependencies } from '../resolvers/resolveReactDependencies';
import { resolveVueDependencies } from '../resolvers/resolveVueDependencies';
import { AnalyzedDependencyNode, FrameworkType, ResolveFunc } from '../types';
import { getProjectStructure } from './projectStructure';
import { getRelativePath } from '../utils/pathClassifier';

export interface AnalyzeContext {
  project: Project;
  resolver?: (
    sourceFile: SourceFile,
    absPath: string
  ) => AnalyzedDependencyNode[];
  projectRoot: string;
  cache: Map<string, AnalyzedDependencyNode>;
}

function getResolverByFramework(
  framework: FrameworkType | null
): ResolveFunc | undefined {
  if (framework === 'vue') return resolveVueDependencies;
  if (['next', 'react', 'taro'].includes(framework ?? ''))
    return resolveReactDependencies;
  return undefined;
}

export function analyzeComponentEntries(
  entries: string[],
  callback?: () => void
): AnalyzedDependencyNode[] {
  const { framework } = getProjectStructure();
  const projectRoot = getProjectRoot();
  const project = new Project({
    tsConfigFilePath: path.resolve(projectRoot, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const context: AnalyzeContext = {
    project,
    resolver: getResolverByFramework(framework),
    projectRoot,
    cache: new Map(),
  };

  const result: AnalyzedDependencyNode[] = [];

  for (const entry of entries) {
    const absPath = path.resolve(projectRoot, entry);
    const relPath = getRelativePath(absPath, process.env.ROOT_DIR);

    const node: AnalyzedDependencyNode = {
      name: path.basename(absPath),
      type: 'entry',
      filePath: relPath,
      deps: collectDependencies(entry, 'entry', context),
    };

    result.push(node);
    callback?.();
  }

  return result;
}

function collectDependencies(
  filePath: string,
  type: AnalyzedDependencyNode['type'],
  context: AnalyzeContext
): AnalyzedDependencyNode[] {
  const { project, resolver, cache } = context;
  const absPath = path.resolve(filePath);
  // 检查缓存
  if (cache.has(absPath)) {
    return cache.get(absPath)?.deps || []; // 返回已有依赖树（被引用）
  }

  let sourceFile: SourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(absPath);
  } catch {
    return [];
  }

  const node: AnalyzedDependencyNode = {
    name: path.basename(absPath),
    type,
    filePath,
    deps: [],
  };

  // 写入缓存（先放进去避免递归死循环）
  cache.set(absPath, node);

  const imports = resolver ? resolver(sourceFile, absPath) : [];

  for (const imp of imports) {
    if (!imp.filePath || imp.filePath === absPath) continue;

    const relDepPath = getRelativePath(imp.filePath, process.env.ROOT_DIR);

    const childNode: AnalyzedDependencyNode = {
      name: imp.name,
      type: imp.type,
      filePath: relDepPath,
      deps: [],
    };

    // 构建递归依赖（组件、hook、函数、const）
    if (['component', 'hook', 'function', 'const'].includes(imp.type)) {
      childNode.deps = collectDependencies(imp.filePath, imp.type, context);
    }

    node.deps.push(childNode);
  }

  return node.deps;
}
