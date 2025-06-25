import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { getTsconfigPaths } from '../utils/pathClassifier';
import { fileExists, getProjectRoot, isExternalDependency } from '../utils/common';


const EXTENSIONS = ['.ts', '.tsx'];
const resolveCache = new Map<string, string | null>();

function resolveToExistingFile(basePath: string): string | null {
  if (resolveCache.has(basePath)) return resolveCache.get(basePath)!;

  const ext = path.extname(basePath);
  const candidates: string[] = [];

  if (ext) {
    candidates.push(basePath);
  } else {
    for (const e of EXTENSIONS) {
      candidates.push(`${basePath}${e}`);
    }
    for (const e of EXTENSIONS) {
      candidates.push(path.join(basePath, `index${e}`));
    }
  }

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      resolveCache.set(basePath, candidate);
      return candidate;
    }
  }

  resolveCache.set(basePath, null);
  return null;
}

/**
 * 将 importSource 解析为绝对路径或标记外部依赖
 */
export function resolveImportModulePath(importSource: string, containingFile: string): string | null {
  const projectRoot = getProjectRoot();
  const { compilerOptions, baseUrl, paths } = getTsconfigPaths(path.join(projectRoot, 'tsconfig.json'));

  // 判断是否 external 依赖
  if (isExternalDependency(importSource)) {
    // 返回特殊标记，外部依赖不用解析真实路径
    return `__EXTERNAL__::${importSource}`;
  }

  // 解析路径别名
  if (paths) {
    for (const alias in paths) {
      const aliasPattern = alias.replace(/\*$/, '');
      if (importSource.startsWith(aliasPattern)) {
        const subPath = importSource.replace(aliasPattern, paths[alias][0].replace(/\*$/, ''));
        const fullPath = path.resolve(projectRoot, baseUrl || '.', subPath);
        const filePath = resolveToExistingFile(fullPath);
        if (filePath) return filePath;
      }
    }
  }

  // 使用 ts 内置模块解析
  const result = ts.resolveModuleName(importSource, containingFile, compilerOptions, ts.sys);
  if (result.resolvedModule?.resolvedFileName) {
    return result.resolvedModule.resolvedFileName;
  }

  // 兜底尝试本地文件路径
  try {
    const importerDir = path.dirname(containingFile);
    const fullPath = path.resolve(importerDir, importSource);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  } catch {
    // 忽略错误
  }

  return null;
}