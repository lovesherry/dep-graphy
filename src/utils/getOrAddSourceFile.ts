// utils/getOrAddSourceFile.ts
import { Project, SourceFile } from 'ts-morph';

export function getOrAddSourceFile(project: Project, filePath: string): SourceFile | undefined {
  let sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) {
    try {
      sourceFile = project.addSourceFileAtPath(filePath);
    } catch {
      return undefined;
    }
  }
  return sourceFile;
}