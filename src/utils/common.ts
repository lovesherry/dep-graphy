// utils/packageUtils.ts
import fs from 'fs';
import path from 'path';

export const getProjectRoot = () => process.env.PROJECT_DIR || process.cwd()

let cachedMergedPkg: Record<string, any> | null = null;
function readPkg(pkgPath: string): Record<string, any> {
  try {
    return fs.existsSync(pkgPath)
      ? JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      : {};
  } catch (err) {
    console.warn(`⚠️ Failed to read ${pkgPath}:`, err);
    return {};
  }
};

export function readMergedPackageJson(): Record<string, any> {
  if (cachedMergedPkg) return cachedMergedPkg;
  const rootPkg = readPkg(path.join(process.cwd(), 'package.json'));
  const projectPkg = getProjectRoot() !== process.cwd() ?
    readPkg(path.join(getProjectRoot(), 'package.json')) :
    {};

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
  return !!dependencies[pkgName]
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

export const hasProjectFile = (filename: string) => {
  return hasFile(filename, getProjectRoot());
}


