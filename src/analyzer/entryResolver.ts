import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DetectedEntry, FrameworkType } from '../types';

function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function readPackageJson(): Record<string, any> {
  const pkgPath = path.resolve('package.json');
  if (!fs.existsSync(pkgPath)) return {};
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

function hasDep(pkg: Record<string, any>, dep: string): boolean {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return !!deps[dep];
}

function detectFramework(pkg: Record<string, any>): FrameworkType {
  if (hasDep(pkg, 'react')) return 'react';
  if (hasDep(pkg, 'vue')) return 'vue';
  return 'unknown';
}

function resolveWebpack(): DetectedEntry | null {
  const files = ['webpack.config.js', 'webpack.config.ts'];
  for (const file of files) {
    if (!fileExists(file)) continue;
    const config = require(path.resolve(file));
    const entry = config?.entry;
    if (!entry) continue;

    let entries: string[] = [];
    if (typeof entry === 'string') entries = [entry];
    else if (Array.isArray(entry)) entries = entry;
    else if (typeof entry === 'object') entries = Object.values(entry).flat() as string[];

    const pkg = readPackageJson();
    return {
      framework: detectFramework(pkg),
      tool: 'webpack',
      entries: entries.map(e => path.resolve(e)),
    };
  }
  return null;
}

function resolveNext(): DetectedEntry | null {
  const pkg = readPackageJson();
  if (!hasDep(pkg, 'next')) return null;

  const entries: string[] = [];
  const extensions = ['.tsx', '.ts'];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else if (extensions.some(ext => fullPath.endsWith(ext))) entries.push(path.resolve(fullPath));
    }
  };

  if (fs.existsSync('app')) walk('app');
  else if (fs.existsSync('pages')) walk('pages');
  else return null;

  return {
    framework: detectFramework(pkg),
    tool: 'next',
    entries,
  };
}

function resolveVite(): DetectedEntry | null {
  const files = ['vite.config.ts', 'vite.config.js'];
  for (const file of files) {
    if (!fileExists(file)) continue;
    const config = require(path.resolve(file));
    const input = config?.build?.rollupOptions?.input;
    if (!input) continue;

    let entries: string[] = [];
    if (typeof input === 'string') entries = [input];
    else if (Array.isArray(input)) entries = input;
    else if (typeof input === 'object') entries = Object.values(input) as string[];

    const pkg = readPackageJson();
    return {
      framework: detectFramework(pkg),
      tool: 'vite',
      entries: entries.map(e => path.resolve(e)),
    };
  }
  return null;
}

function resolveTaro(): DetectedEntry | null {
  const pkg = readPackageJson();
  if (!hasDep(pkg, '@tarojs/taro')) return null;

  const entries: string[] = [];

  const appPaths = ['src/app.tsx', 'src/app.ts'];
  for (const p of appPaths) {
    const full = path.resolve(p);
    try {
      if (fs.statSync(full).isFile()) entries.push(full);
    } catch { }
  }

  const configFiles = ['src/app.config.ts', 'src/app.config.json'];
  for (const configFile of configFiles) {
    const full = path.resolve(configFile);
    if (!fileExists(full)) continue;

    try {
      const content = fs.readFileSync(full, 'utf-8');
      const match = content.match(/pages\s*:\s*\[([^\]]+)\]/);
      if (match) {
        const raw = match[1];
        const pagePaths = raw
          .split(',')
          .map(line => line.replace(/['"`]/g, '').trim())
          .filter(Boolean)
          .map(p => path.resolve('src', `${p}.tsx`))
          .filter(fileExists);
        entries.push(...pagePaths);
      }
    } catch { }
  }

  return {
    framework: detectFramework(pkg),
    tool: 'taro',
    entries,
  };
}

export async function detectEntryFiles(): Promise<DetectedEntry> {
  return (
    resolveNext() ||
    resolveWebpack() ||
    resolveVite() ||
    resolveTaro() ||
    (() => {
      throw new Error(chalk.red('❌ Unable to detect entry files. Please check your project structure.'));
    })()
  );
}
