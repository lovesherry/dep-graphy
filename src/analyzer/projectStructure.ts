import path from 'path';
import fs from 'fs';
import { BuildTool, FrameworkType } from '../types';
import { getProjectRoot, hasProjectFile, readMergedPackageJson } from '../utils/common';

const ValidFrameworkList: FrameworkType[] = [
  'next',
  'nuxt',
  'react',
  'vue',
  'taro',
  'unknown',
];
function hasDep(dep: string): boolean {
  const { dependencies } = readMergedPackageJson();
  return !!dependencies[dep];
}

function detectBuildTool(): BuildTool {

  // 1. ✅ Next.js 检测（结合构建器）
  if (hasProjectFile('next.config.js') || hasProjectFile('next.config.mjs') || hasProjectFile('next.config.ts')) {
    try {
      const nextConfigPath = path.join(getProjectRoot(), 'next.config.js');
      if (fs.existsSync(nextConfigPath)) {
        const config = require(nextConfigPath);
        if (config.experimental?.turbo === true) return 'turbopack';
      }
    } catch {
      // 静默跳过 require 报错
    }
    return 'webpack'; // 默认 Next 使用 webpack
  }

  // 2. ✅ Vite: 配置文件 & 依赖判断
  if (
    hasProjectFile('vite.config.ts') ||
    hasProjectFile('vite.config.js') ||
    hasProjectFile('vite.config.mjs')
  ) {
    return 'vite';
  }

  // 3. ✅ Webpack
  if (hasProjectFile('webpack.config.js') || hasProjectFile('webpack.config.ts')) {
    return 'webpack';
  }

  // 4. ✅ Rollup
  if (hasProjectFile('rollup.config.js') || hasProjectFile('rollup.config.ts')) {
    return 'rollup';
  }

  // 5. ✅ Turbopack（非 Next 项目，极少见）
  if (hasProjectFile('turbopack.config.js') || hasProjectFile('turbopack.config.ts')) {
    return 'turbopack';
  }

  if (hasDep('vite')) return 'vite';
  if (hasDep('webpack')) return 'webpack';
  if (hasDep('rollup')) return 'rollup';
  if (hasDep('parcel')) return 'parcel';
  if (hasDep('esbuild')) return 'esbuild';
  if (hasDep('@vercel/turbopack')) return 'turbopack';

  return 'unknown';
}

function detectFramework(defaultFramework?: FrameworkType): FrameworkType {
  if (defaultFramework) {
    if (ValidFrameworkList.includes(defaultFramework)) {
      return defaultFramework;
    }
    throw new Error(`Invalid framework type: ${defaultFramework}`);
  }
  if (hasDep('next')) return 'next';
  if (hasDep('nuxt')) return 'nuxt';
  if (hasDep('@tarojs/taro')) return 'taro';
  if (hasDep('react')) return 'react';
  if (hasDep('vue')) return 'vue';
  return 'unknown';
}


class ProjectStructure {
  framework: FrameworkType;
  buildTool: BuildTool;

  constructor(defaultFramework?: FrameworkType) {
    this.framework = detectFramework(defaultFramework);
    this.buildTool = detectBuildTool();
  }
}

let instance: ProjectStructure | null = null;

// ✅ 用于 main.ts 初始化（只允许设置一次）
export function initProjectStructure(defaultFramework?: FrameworkType) {
  if (!instance) {
    instance = new ProjectStructure(defaultFramework);
  } else {
    console.warn('[ProjectStructure] Already initialized, skipping.');
  }
}

// ✅ 供所有模块调用：始终拿到同一个实例
export function getProjectStructure(): ProjectStructure {
  if (!instance) {
    throw new Error('ProjectStructure is not initialized. Please call initProjectStructure() first.');
  }
  return instance;
}