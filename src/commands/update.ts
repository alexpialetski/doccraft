import path from 'node:path';
import chalk from 'chalk';
import { runOpenspec } from '../utils/openspec.js';

export interface UpdateOptions {
  force?: boolean;
  skipOpenspec?: boolean;
}

export async function runUpdate(targetPath: string, options: UpdateOptions): Promise<void> {
  const resolvedPath = path.resolve(targetPath);

  console.log(chalk.bold('\ndoccraft update'));
  console.log(chalk.dim(`Target: ${resolvedPath}\n`));

  if (!options.skipOpenspec) {
    const openspecArgs = ['update', resolvedPath];
    if (options.force) openspecArgs.push('--force');

    const code = await runOpenspec(openspecArgs);
    if (code !== 0) {
      throw new Error(`openspec update exited with code ${code}`);
    }
  } else {
    console.log(chalk.dim('Skipping openspec update (--skip-openspec)'));
  }

  // TODO(skills): refresh doccraft skill templates alongside openspec instructions.
  console.log(chalk.yellow('\nSkill template refresh: coming in the next release.'));
  console.log(chalk.green('\nDone.'));
}
