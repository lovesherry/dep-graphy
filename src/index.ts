import cliProgress from 'cli-progress';
import { Command } from 'commander';
import { analyzeComponentEntry } from './analyzer/componentAnalyzer';
import { detectEntryFiles } from './analyzer/entryResolver';
import { renderAnalyzedHtml } from './output/htmlVisualizer';
import { FrameworkType } from './types';

const allowedFrameworks: FrameworkType[] = ['next', 'nuxt', 'react', 'vue', 'taro', 'unknown'];


export function parseArgs(): { framework?: FrameworkType } {
  const program = new Command();
  program
    .option('-f, --framework <framework>', 'specify the framework', (value) => {
      if (!allowedFrameworks.includes(value as FrameworkType)) {
        console.warn(`⚠️ Unsupported framework "${value}". Falling back to auto-detection.`);
        return undefined;
      }
      return value;
    });
  program.parse(process.argv);
  const options = program.opts();
  return {
    framework: options.framework,
  };
}


async function main() {
  try {
    const { framework } = parseArgs();
    const { framework: detectedFramework, entries } = await detectEntryFiles(framework);
    console.log(
      'Detected entries:\n' +
      entries.map((entry, i) => `  ${i + 1}. ${entry}`).join('\n')
    );
    const results = [];
    console.time('Total analyze time');
    const progressBar = new cliProgress.SingleBar({
      format: 'Analyzing [{bar}] {percentage}% | {value}/{total} entries',
      hideCursor: true,
      barCompleteChar: '=',
      barIncompleteChar: ' ',
    }, cliProgress.Presets.shades_classic);

    progressBar.start(entries.length, 0);

    for (const entry of entries) {
      const tree = await analyzeComponentEntry(entry, detectedFramework);
      results.push(tree);
      progressBar.increment();
    }

    progressBar.stop();

    console.timeEnd('Total analyze time');

    await renderAnalyzedHtml(results);
    console.log('✅ dependency-graph.html has been generated.');
  } catch (error) {
    console.error('❌ Failed to generate dependency graph:', error);
  }
}

main();