import cliProgress from 'cli-progress';
import { analyzeComponentEntry } from './analyzer/componentAnalyzer';
import { detectEntryFiles } from './analyzer/entryResolver';
import { renderAnalyzedHtml } from './output/htmlVisualizer';

async function main() {
  try {
    const { framework, entries } = await detectEntryFiles();
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
      const tree = await analyzeComponentEntry(entry, framework);
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