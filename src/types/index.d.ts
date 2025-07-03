import { SourceFile } from 'ts-morph';
export type AnalyzedDependencyNode = {
  name: string; // 引用项的名称，如 'throttle', 'Foo', 'useBar', 'default'
  type:
    | 'external'
    | 'component'
    | 'hook'
    | 'function'
    | 'enum'
    | 'type'
    | 'interface'
    | 'const'
    | 'entry'
    | 'ignored'
    | 'media'
    | 'style'
    | 'circular'
    | 'unknown';
  filePath: string; // 本地文件的绝对路径，仅对非 external 有意义
  deps: AnalyzedDependencyNode[]; // 子依赖（递归）
};

export type FrameworkType =
  | 'next'
  | 'nuxt'
  | 'react'
  | 'vue'
  | 'taro'
  | 'unknown';

export type BuildTool =
  | 'webpack'
  | 'turbopack'
  | 'vite'
  | 'rollup'
  | 'parcel'
  | 'esbuild'
  | 'unknown';

export interface DetectedEntry {
  framework: FrameworkType;
  tool?: BuildTool;
  entries: string[];
}

export type ResolveFunc = (
  sourceFile: SourceFile,
  absPath: string
) => AnalyzedDependencyNode[];
