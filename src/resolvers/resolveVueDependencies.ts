import { SourceFile } from 'ts-morph';
import { AnalyzedDependencyNode } from '../types';

export function resolveVueDependencies(_file: SourceFile): NonNullable<AnalyzedDependencyNode['deps']> {
  // TODO: 实现 Vue 组件的依赖解析逻辑（支持 .vue 单文件组件的 AST 分析）
  return [];
}