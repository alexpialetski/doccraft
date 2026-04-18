import { Command } from 'commander';
import { createRequire } from 'node:module';
import ora from 'ora';
import { runInit } from '../commands/init.js';
import { runUpdate } from '../commands/update.js';

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

program
  .name('doccraft')
  .description('Documentation and project-story skills for Claude Code and Cursor, layered on OpenSpec')
  .version(version);

program
  .command('init [path]')
  .description('Initialize doccraft in a project (runs openspec init, then installs doccraft skills)')
  .option('--tools <tools>', 'Forwarded to openspec init (e.g. "claude", "cursor", or "all")')
  .option('--force', 'Forwarded to openspec init')
  .option('--profile <profile>', 'Forwarded to openspec init')
  .option('--skip-openspec', 'Skip running openspec init (install doccraft skills only)')
  .action(async (targetPath: string = '.', options) => {
    try {
      await runInit(targetPath, options);
    } catch (error) {
      console.log();
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('update [path]')
  .alias('upgrade')
  .description('Update doccraft skills and refresh openspec instructions')
  .option('--force', 'Force update even when already up to date')
  .option('--tools <tools>', 'Which tools to refresh doccraft skills into (e.g. "claude", "cursor", "all", "none")')
  .option('--skip-openspec', 'Skip running openspec update (refresh doccraft skills only)')
  .action(async (targetPath: string = '.', options) => {
    try {
      await runUpdate(targetPath, options);
    } catch (error) {
      console.log();
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parseAsync().catch((error) => {
  console.error(`Error: ${(error as Error).message}`);
  process.exit(1);
});
