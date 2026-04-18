import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { runOpenspec } from '../utils/openspec.js';

export interface InitOptions {
  tools?: string;
  force?: boolean;
  profile?: string;
  skipOpenspec?: boolean;
}

export async function runInit(targetPath: string, options: InitOptions): Promise<void> {
  const resolvedPath = path.resolve(targetPath);

  console.log(chalk.bold('\ndoccraft init'));
  console.log(chalk.dim(`Target: ${resolvedPath}\n`));

  if (!options.skipOpenspec) {
    const spinner = ora('Running openspec init...').start();
    spinner.stop();

    const openspecArgs = ['init', resolvedPath];
    if (options.tools) openspecArgs.push('--tools', options.tools);
    if (options.force) openspecArgs.push('--force');
    if (options.profile) openspecArgs.push('--profile', options.profile);

    const code = await runOpenspec(openspecArgs);
    if (code !== 0) {
      throw new Error(`openspec init exited with code ${code}`);
    }
  } else {
    console.log(chalk.dim('Skipping openspec init (--skip-openspec)'));
  }

  // TODO(skills): install doccraft skill templates into docs/, .claude/, .cursor/.
  // See https://github.com/alexpialetski/doccraft/issues/1
  console.log(chalk.yellow('\nSkill templates: coming in the next release.'));
  console.log(chalk.green('\nDone.'));
}
