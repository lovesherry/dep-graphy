import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { getTsconfigPaths } from '../utils/pathClassifier';

const projectRoot = process.cwd();
const pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const dependencies = {
  ...pkgJson.dependencies,
  ...pkgJson.devDependencies,
};

const { compilerOptions, baseUrl, paths } = getTsconfigPaths(path.join(projectRoot, 'tsconfig.json'));
const EXTENSIONS = ['.ts', '.tsx'];
const resolveCache = new Map<string, string | null>();

/**
 * 判断是否是实际存在的文件
 */
function isRealFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * 尝试解析 basePath 为存在的文件（带后缀或 index 文件）
 */
function resolveToExistingFile(basePath: string): string | null {
  if (resolveCache.has(basePath)) return resolveCache.get(basePath)!;

  const ext = path.extname(basePath);
  const candidates: string[] = [];

  if (ext) {
    candidates.push(basePath);
  } else {
    // 尝试补全扩展名
    for (const e of EXTENSIONS) {
      candidates.push(`${basePath}${e}`);
    }
    // 尝试 index 文件
    for (const e of EXTENSIONS) {
      candidates.push(path.join(basePath, `index${e}`));
    }
  }

  for (const candidate of candidates) {
    if (isRealFile(candidate)) {
      resolveCache.set(basePath, candidate);
      return candidate;
    }
  }

  resolveCache.set(basePath, null);
  return null;
}

/**
 * 将 importSource 解析为绝对路径（支持第三方、路径别名、相对路径）
 */
export function resolveImportModulePath(importSource: string, containingFile: string): string | null {
  // ✅ 第三方依赖
  if (dependencies[importSource]) {
    const resolved = path.resolve(projectRoot, 'node_modules', importSource);
    return fs.existsSync(resolved) ? resolved : null;
  }

  // ✅ 路径别名
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

  // ✅ 相对路径 / 绝对路径模块
  const result = ts.resolveModuleName(importSource, containingFile, compilerOptions, ts.sys);
  if (result.resolvedModule?.resolvedFileName) {
    return result.resolvedModule.resolvedFileName;
  }

  // ✅ 兜底处理：像 .scss / .css / .svg / .png 等实际存在但不是 TS 模块的
  try {
    const importerDir = path.dirname(containingFile);
    const fullPath = path.resolve(importerDir, importSource);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  } catch {
    return null;
  }

  return null;
}