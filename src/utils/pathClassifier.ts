// src/utils/pathClassifier.ts
import path from 'path';
import ts from 'typescript';

export function getRelativePath(
  absPath: string,
  baseDir: string = process.cwd()
): string {
  return path.relative(baseDir, absPath).replace(/\\/g, '/');
}

let cachedTsconfig: {
  compilerOptions: ts.CompilerOptions;
  baseUrl: string;
  paths: ts.MapLike<string[]>;
} | null = null;
export function getTsconfigPaths(
  tsconfigPath: string
): NonNullable<typeof cachedTsconfig> {
  if (cachedTsconfig) return cachedTsconfig;
  const configFile = ts.readConfigFile(
    tsconfigPath,
    ts.sys.readFile.bind(ts.sys)
  );
  const result = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath)
  );

  cachedTsconfig = {
    compilerOptions: result.options,
    baseUrl: result.options.baseUrl || '.',
    paths: result.options.paths || {},
  };
  return cachedTsconfig;
}
