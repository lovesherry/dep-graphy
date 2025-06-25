// src/utils/pathClassifier.ts
import path from 'path';
import ts from 'typescript';


export function getRelativePath(absPath: string, baseDir: string = process.cwd()) {
  return path.relative(baseDir, absPath).replace(/\\/g, '/');
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
