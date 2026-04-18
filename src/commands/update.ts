import path from 'node:path';
import chalk from 'chalk';
import { runOpenspec } from '../utils/openspec.js';
import { installDoccraftSkills } from './init.js';
import { formatToolsArg, validateConsolidate } from '../utils/skills.js';

export interface UpdateOptions {
  force?: boolean;
  tools?: string;
  skipOpenspec?: boolean;
  consolidate?: boolean;
}

export async function runUpdate(targetPath: string, options: UpdateOptions): Promise<void> {
  const resolvedPath = path.resolve(targetPath);

  console.log(chalk.bold('\ndoccraft update'));
  console.log(chalk.dim(`Target: ${resolvedPath}\n`));

  if (options.consolidate) {
    // Update defers tool resolution to the install helper (detect-existing
    // is the right default here), so validation has to work from the
    // explicit --tools value when present. Without explicit tools, the
    // detect step happens too late; fail fast if the user passed
    // --consolidate without --tools.
    if (!options.tools) {
      throw new Error(
        '--consolidate on `doccraft update` requires --tools to be set explicitly ' +
          '(e.g. --tools claude,cursor). Update detects installed tools by default, ' +
          'but --consolidate is opinionated about the pair of tools selected.'
      );
    }
    validateConsolidate(options.tools);
    console.log(
      chalk.dim(`Tools: ${formatToolsArg(options.tools)}`)
    );
    console.log(
      chalk.dim(
        'Consolidate: skills → .claude/skills/ only (Cursor 2.4+ auto-discovers).\n'
      )
    );
  }

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

  await installDoccraftSkills(resolvedPath, options.tools, {
    consolidate: options.consolidate ?? false,
  });

  console.log(chalk.green('\nDone.'));
}
