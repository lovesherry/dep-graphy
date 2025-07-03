import path from 'path';
import fs from 'fs';
import cliProgress from 'cli-progress';
import { Command } from 'commander';
import { analyzeComponentEntries } from './analyzer/componentAnalyzer';
import { detectEntryFiles } from './analyzer/entryResolver';
import { renderAnalyzedHtml } from './output/htmlVisualizer';
import { FrameworkType } from './types';

export function parseArgs(): { defaultFramework?: FrameworkType } {
  const program = new Command();

  program
    .option(
      '-f, --framework <framework>',
      'specify the framework (e.g., next, taro)'
    )
    .option(
      '-p, --project <path>',
      'Specify the project root directory, defaults to current working directory (e.g., client)'
    );

  program.parse(process.argv);
  const options = program.opts();

  const resolvedProject = options.project
    ? path.resolve(process.cwd(), options.project as string)
    : process.cwd();

  if (!fs.existsSync(resolvedProject)) {
    console.error(`❌ Project path "${resolvedProject}" does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(path.resolve(resolvedProject, 'tsconfig.json'))) {
    throw new Error(`❌ tsconfig.json not found in ${resolvedProject}`);
  }

  process.env.PROJECT_DIR = resolvedProject;
  process.env.ROOT_DIR = process.cwd();

  console.log(`📁 Analyzing project at: ${resolvedProject}`);

  return { defaultFramework: options.framework as FrameworkType };
}

function main(): void {
  try {
    const { defaultFramework } = parseArgs();
    const { entries } = detectEntryFiles(defaultFramework);
    console.time('Total analyze time');
    const progressBar = new cliProgress.SingleBar(
      {
        format: 'Analyzing [{bar}] {percentage}% | {value}/{total} entries',
        hideCursor: true,
        barCompleteChar: '=',
        barIncompleteChar: ' ',
      },
      cliProgress.Presets.shades_classic
    );

    progressBar.start(entries.length, 0);
    const results = analyzeComponentEntries(entries, () => {
      progressBar.increment();
    });
    progressBar.stop();
    console.timeEnd('Total analyze time');
    renderAnalyzedHtml(results);
    console.log('✅ dependency-graph.html has been generated.');
  } catch (error) {
    console.error('❌ Failed to generate dependency graph:', error);
  }
}

main();
