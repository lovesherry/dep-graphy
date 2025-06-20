import ignore from 'ignore';
import fs from 'fs';
import path from 'path';
import { getRelativePath } from './pathClassifier';


const ignoreFile = path.resolve('.compressignore');
const ignorer = ignore();

if (fs.existsSync(ignoreFile)) {
  const content = fs.readFileSync(ignoreFile, 'utf-8');
  ignorer.add(content);
}

export const sharedIgnorer = ignorer;


export function shouldIgnore(filePath: string): boolean {
  return sharedIgnorer.ignores(getRelativePath(filePath));
}