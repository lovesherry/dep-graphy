export type AnalyzedDependencyNode = {
  name: string;                 // 引用项的名称，如 'throttle', 'Foo', 'useBar', 'default'
  type: 'external' | 'component' | 'hook' | 'function' | 'enum' | 'type' | 'interface' | 'const' | 'entry' | 'ignored' | 'media' | 'style' | 'circular' | 'unknown';
  filePath: string;           // 本地文件的绝对路径，仅对非 external 有意义
  deps?: AnalyzedDependencyNode[];  // 子依赖（递归）
};

export type FrameworkType = 'react' | 'vue' | 'svelte' | 'solid' | 'unknown';
export type BuildTool = 'webpack' | 'vite' | 'next' | 'taro' | 'nuxt' | 'other';

export interface DetectedEntry {
  framework: FrameworkType;
  tool?: BuildTool;
  entries: string[];
}
