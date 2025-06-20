import fs from 'fs';
import path from 'path';
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
  if (hasDep(pkg, 'next')) return 'next';
  if (hasDep(pkg, 'nuxt')) return 'nuxt';
  if (hasDep(pkg, '@tarojs/taro')) return 'taro';
  if (hasDep(pkg, 'react')) return 'react';
  if (hasDep(pkg, 'vue')) return 'vue';
  return 'unknown';
}

function resolveWebpack(framework: FrameworkType): DetectedEntry | null {
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

    return {
      framework,
      tool: 'webpack',
      entries: entries.map(e => path.resolve(e)),
    };
  }
  return null;
}

function resolveVite(framework: FrameworkType): DetectedEntry | null {
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

    return {
      framework,
      tool: 'vite',
      entries: entries.map(e => path.resolve(e)),
    };
  }
  return null;
}

function resolveNext(): DetectedEntry | null {
  const entries: string[] = [];
  const extensions = ['.tsx'];
  const dirs = ['app', 'pages', path.join('src', 'app'), path.join('src', 'pages')];

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else if (extensions.some(ext => fullPath.endsWith(ext))) {
        entries.push(path.resolve(fullPath));
      }
    }
  };

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      walk(dir);
      break;
    }
  }

  if (entries.length === 0) return null;

  return {
    framework: 'next',
    tool: 'unknown',
    entries,
  };
}

function resolveTaro(): DetectedEntry | null {
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

  return entries.length
    ? {
      framework: 'taro',
      tool: 'unknown',
      entries,
    }
    : null;
}

export async function detectEntryFiles(preferredFramework?: FrameworkType): Promise<DetectedEntry> {
  const pkg = readPackageJson();
  const framework = preferredFramework || detectFramework(pkg)

  switch (framework) {
    case 'next': {
      const res = resolveNext();
      if (res) return res;
      throw new Error('❌ Could not detect Next.js entries.');
    }
    case 'nuxt': {
      throw new Error('❌ Nuxt.js support is not implemented yet.');
    }
    case 'taro': {
      const res = resolveTaro();
      if (res) return res;
      throw new Error('❌ Could not detect Taro entries.');
    }
    case 'react':
    case 'vue': {
      const res = resolveWebpack(framework) || resolveVite(framework);
      if (res) return res;
      throw new Error('❌ Could not detect entries via Webpack or Vite.');
    }
    default:
      throw new Error('❌ Unable to detect entry files. Please check your project structure.');
  }
}
