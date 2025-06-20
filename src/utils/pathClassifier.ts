// src/utils/pathClassifier.ts
import path from 'path';
import ts from 'typescript';
import fs from 'fs';

const cwd = process.cwd();



export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}


export function getTsconfigPaths(tsconfigPath: string) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const result = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath)
  );

  return {
    compilerOptions: result.options,
    baseUrl: result.options.baseUrl || '.',
    paths: result.options.paths || {},
  };
}
