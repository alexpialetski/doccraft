import path from 'node:path';
import { createRequire } from 'node:module';
import chalk from 'chalk';
import { runOpenspec } from '../utils/openspec.js';
import { installDoccraftSkills } from './init.js';
import { bumpConfigVersion } from '../utils/skills.js';

const _require = createRequire(import.meta.url);
const PACKAGE_VERSION: string = (_require('../../package.json') as { version: string }).version;

export interface UpdateOptions {
  force?: boolean;
  tools?: string;
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

  // installDoccraftSkills reads doccraft.json features and replays designer-skills when `design` is enabled.
  await installDoccraftSkills(resolvedPath, options.tools);
  await bumpConfigVersion(resolvedPath, PACKAGE_VERSION);

  console.log(chalk.green('\nDone.'));
}
