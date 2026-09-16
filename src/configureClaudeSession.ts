import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PassThrough } from 'node:stream';
import chalk from 'chalk';


interface ModelOption {
  key: string;
  label: string;
  tag: string;
}

interface EffortOption {
  key: string;
  label: string;
  tag: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  blurb: string;
}

export const MODELS: ModelOption[] = [
  { key: '1', label: 'Claude Sonnet 5', tag: 'claude-sonnet-5' },
  { key: '2', label: 'Claude Opus 4.8', tag: 'claude-opus-4-8' },
  { key: '3', label: 'Claude Haiku 4.5', tag: 'claude-haiku-4-5-20251001' },
  { key: '4', label: 'Claude Fable 5', tag: 'claude-fable-5' },
];

const EFFORT_LEVELS: EffortOption[] = [
  { key: '1', label: 'Low', tag: 'low', blurb: 'Fastest, most token-efficient' },
  { key: '2', label: 'Medium', tag: 'medium', blurb: 'Balanced speed and quality' },
  { key: '3', label: 'High', tag: 'high', blurb: 'Default — best for complex work' },
  { key: '4', label: 'X-High', tag: 'xhigh', blurb: 'Deeper reasoning, higher latency' },
  { key: '5', label: 'Max', tag: 'max', blurb: 'Maximum capability, no depth limit' },
];

const DEFAULT_MODEL_KEY = '1';
const DEFAULT_EFFORT_KEY = '3';

const WIDTH = 56;

function rule(char = '─') {
  return chalk.gray(char.repeat(WIDTH));
}

function box(title: string) {
  const pad = Math.max(0, WIDTH - title.length - 4);
  console.log(chalk.gray('┌' + '─'.repeat(WIDTH - 2) + '┐'));
  console.log(
    chalk.gray('│ ') + chalk.bold.cyan(title) + ' '.repeat(pad) + chalk.gray(' │'),
  );
  console.log(chalk.gray('└' + '─'.repeat(WIDTH - 2) + '┘'));
}

function renderModelMenu() {
  console.log(chalk.bold.white('\n  Select a model'));
  console.log(rule());
  for (const m of MODELS) {
    const marker = m.key === DEFAULT_MODEL_KEY ? chalk.green(' (default)') : '';
    console.log(
      `  ${chalk.yellow(m.key)}  ${chalk.white(m.label.padEnd(20))} ${chalk.dim(m.tag)}${marker}`,
    );
  }
  console.log(rule());
}

function renderEffortMenu() {
  console.log(chalk.bold.white('\n  Select an effort level'));
  console.log(rule());
  for (const e of EFFORT_LEVELS) {
    const marker = e.key === DEFAULT_EFFORT_KEY ? chalk.green(' (default)') : '';
    console.log(
      `  ${chalk.yellow(e.key)}  ${chalk.white(e.label.padEnd(10))} ${chalk.dim(e.blurb)}${marker}`,
    );
  }
  console.log(rule());
}

function renderSummary(modelTag: string, effortTag: string) {
  console.log('\n' + chalk.gray('┌' + '─'.repeat(WIDTH - 2) + '┐'));
  console.log(chalk.gray('│') + chalk.bold.green('  ✓ Session configured'.padEnd(WIDTH - 2)) + chalk.gray('│'));
  console.log(chalk.gray('├' + '─'.repeat(WIDTH - 2) + '┤'));
  console.log(
    chalk.gray('│  ') +
      chalk.dim('model  ') +
      chalk.cyan(modelTag.padEnd(WIDTH - 13)) +
      chalk.gray('│'),
  );
  console.log(
    chalk.gray('│  ') +
      chalk.dim('effort ') +
      chalk.cyan(effortTag.padEnd(WIDTH - 13)) +
      chalk.gray('│'),
  );
  console.log(chalk.gray('└' + '─'.repeat(WIDTH - 2) + '┘\n'));
}

function createFilteredStdin(source: NodeJS.ReadStream): { stream: PassThrough; cleanup: () => void } {
  const filtered = new PassThrough();

  const onData = (chunk: Buffer) => {
    const str = chunk.toString();
    const stripped = str
      .replace(/\x1B\[<[0-9;]+[mM]/g, '')  // SGR (1006) mouse sequences
      .replace(/\x1B\[M[\s\S]{3}/g, '');   // X10 mouse sequences (button byte + coords)

    if (stripped.length > 0) {
      filtered.write(stripped);
    }
  };

  source.on('data', onData);

  const cleanup = () => {
    source.removeListener('data', onData);
  };

  return { stream: filtered, cleanup };
}


export interface ClaudeSessionConfig {
  selectedModel: string;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

async function configureClaudeSession(): Promise<ClaudeSessionConfig> {
  const { stream: cleanInput, cleanup } = createFilteredStdin(input);
  const rl = readline.createInterface({ input: cleanInput, output });

  box('Claude Session Configuration');

  // 1. Model selection
  renderModelMenu();
  const modelAnswer = (
    await rl.question(chalk.yellow(`  Choice [${DEFAULT_MODEL_KEY}]: `))
  ).trim();
  const chosenModel =
    MODELS.find((m) => m.key === modelAnswer) ??
    MODELS.find((m) => m.key === DEFAULT_MODEL_KEY)!;

  // 2. Effort selection
  renderEffortMenu();
  const effortAnswer = (
    await rl.question(chalk.yellow(`  Choice [${DEFAULT_EFFORT_KEY}]: `))
  ).trim();
  const chosenEffort =
    EFFORT_LEVELS.find((e) => e.key === effortAnswer) ??
    EFFORT_LEVELS.find((e) => e.key === DEFAULT_EFFORT_KEY)!;

  rl.close();
  cleanup();

  renderSummary(chosenModel.tag, chosenEffort.tag);

  return { selectedModel: chosenModel.tag, effort: chosenEffort.tag };
}

export { configureClaudeSession };
