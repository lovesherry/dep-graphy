/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs from 'fs';
import path from 'path';

export const getProjectRoot = (): string =>
  process.env.PROJECT_DIR || process.cwd();

let cachedMergedPkg: {
  dependencies: Record<string, string>;
} | null = null;
function readPkg(pkgPath: string): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  try {
    return fs.existsSync(pkgPath)
      ? JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      : {};
  } catch (err) {
    console.warn(`⚠️ Failed to read ${pkgPath}:`, err);
    return {};
  }
}

export function readMergedPackageJson(): NonNullable<typeof cachedMergedPkg> {
  if (cachedMergedPkg) return cachedMergedPkg;
  const rootPkg = readPkg(path.join(process.cwd(), 'package.json'));
  const projectPkg =
    getProjectRoot() !== process.cwd()
      ? readPkg(path.join(getProjectRoot(), 'package.json'))
      : {};

  cachedMergedPkg = {
    dependencies: {
      ...(rootPkg.dependencies || {}),
      ...(rootPkg.devDependencies || {}),
      ...(projectPkg.dependencies || {}),
      ...(projectPkg.devDependencies || {}),
    },
  };

  return cachedMergedPkg;
}
/**
 * 判断模块名是否是 external（来自 package.json 中 dependencies）
 */
export function isExternalDependency(importSource: string): boolean {
  const { dependencies } = readMergedPackageJson();
  if (dependencies[importSource]) return true;
  const [pkgName] = importSource.split('/');
  return !!dependencies[pkgName];
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function hasFile(fileName: string, dir = process.cwd()): boolean {
  return fileExists(path.join(dir, fileName));
}

export const hasProjectFile = (filename: string): boolean => {
  return hasFile(filename, getProjectRoot());
};
