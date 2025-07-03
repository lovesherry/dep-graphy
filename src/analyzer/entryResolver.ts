/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import { BuildTool, DetectedEntry, FrameworkType } from '../types';
import { fileExists, getProjectRoot } from '../utils/common';
import { getProjectStructure, initProjectStructure } from './projectStructure';

function resolvePath(projectRoot: string, relative: string): string {
  return path.resolve(projectRoot, relative);
}

function resolveWebpack(): DetectedEntry['entries'] | null {
  const projectRoot = getProjectRoot();
  const files = ['webpack.config.js', 'webpack.config.ts'];
  for (const file of files) {
    const full = resolvePath(projectRoot, file);
    if (!fileExists(full)) continue;
    const config = require(require.resolve(full, { paths: [projectRoot] }));
    const entry = config?.entry;
    if (!entry) continue;

    let entries: string[] = [];
    if (typeof entry === 'string') entries = [entry];
    else if (Array.isArray(entry)) entries = entry;
    else if (typeof entry === 'object')
      entries = Object.values(entry).flat() as string[];
    return entries.map((e) => path.resolve(projectRoot, e));
  }
  return null;
}

function resolveVite(): DetectedEntry['entries'] | null {
  const projectRoot = getProjectRoot();
  const files = ['vite.config.ts', 'vite.config.js'];
  for (const file of files) {
    const full = resolvePath(projectRoot, file);
    if (!fileExists(full)) continue;

    const config = require(require.resolve(full, { paths: [projectRoot] }));

    const input = config?.build?.rollupOptions?.input;
    if (!input) continue;

    let entries: string[] = [];
    if (typeof input === 'string') entries = [input];
    else if (Array.isArray(input)) entries = input;
    else if (typeof input === 'object') entries = Object.values(input);

    return entries.map((e) => path.resolve(projectRoot, e));
  }
  return null;
}

function resolveNext(): DetectedEntry['entries'] | null {
  const projectRoot = getProjectRoot();
  const entries: string[] = [];
  const extensions = ['.tsx'];
  const dirs = [
    'app',
    'pages',
    path.join('src', 'app'),
    path.join('src', 'pages'),
  ];

  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else if (extensions.some((ext) => fullPath.endsWith(ext))) {
        entries.push(path.resolve(fullPath));
      }
    }
  };

  for (const dir of dirs) {
    const fullDir = path.resolve(projectRoot, dir);
    if (fs.existsSync(fullDir)) {
      walk(fullDir);
      break;
    }
  }

  if (entries.length === 0) return null;

  return entries;
}

function resolveTaro(): DetectedEntry['entries'] | null {
  const projectRoot = getProjectRoot();
  const entries: string[] = [];
  const appPaths = ['src/app.tsx', 'src/app.ts'];
  for (const p of appPaths) {
    const full = resolvePath(projectRoot, p);
    try {
      if (fs.statSync(full).isFile()) entries.push(full);
    } catch {
      // 忽略文件不存在的错误
      console.warn(`File not found: ${full}`);
    }
  }

  const configFiles = ['src/app.config.ts', 'src/app.config.json'];
  for (const configFile of configFiles) {
    const full = resolvePath(projectRoot, configFile);
    if (!fileExists(full)) continue;

    try {
      const content = fs.readFileSync(full, 'utf-8');
      const match = content.match(/pages\s*:\s*\[([^\]]+)\]/);
      if (match) {
        const raw = match[1];
        const pagePaths = raw
          .split(',')
          .map((line) => line.replace(/['"`]/g, '').trim())
          .filter(Boolean)
          .map((p) => resolvePath(projectRoot, 'src/' + p + '.tsx'))
          .filter(fileExists);
        entries.push(...pagePaths);
      }
    } catch {
      console.warn(`Failed to read or parse config file: ${full}`);
    }
  }

  return entries.length ? entries : null;
}

const getEntryFiles = (
  framework: FrameworkType,
  buildTool: BuildTool
): DetectedEntry['entries'] | null => {
  if (framework === 'next') return resolveNext();
  if (framework === 'nuxt') return null; // Nuxt.js support not implemented   yet
  if (framework === 'taro') return resolveTaro();
  if (buildTool === 'webpack') return resolveWebpack();
  if (buildTool === 'vite') return resolveVite();
  return null;
};

export function detectEntryFiles(
  defaultFramework?: FrameworkType
): DetectedEntry {
  initProjectStructure(defaultFramework);
  const { buildTool, framework } = getProjectStructure();
  console.log(`Framework: ${framework} Build Tool: ${buildTool}`);
  const entryFiles = getEntryFiles(framework, buildTool);
  if (!entryFiles) {
    if (framework === 'nuxt') {
      throw new Error('❌ Nuxt.js support is not implemented yet.');
    }
    throw new Error(
      `❌ Could not detect entry files for ${framework} with ${buildTool}.`
    );
  }
  console.log(
    'Detected entries:\n' +
      entryFiles.map((entry, i) => `  ${i + 1}. ${entry}`).join('\n')
  );
  return {
    framework,
    tool: buildTool,
    entries: entryFiles,
  };
}
