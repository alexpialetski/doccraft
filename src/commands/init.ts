import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { runOpenspec } from '../utils/openspec.js';
import {
  detectInstalledTools,
  getAvailableSkills,
  installSkills,
  parseToolsArg,
  SUPPORTED_TOOLS,
  type SkillTool,
} from '../utils/skills.js';

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

  await installDoccraftSkills(resolvedPath, options.tools);

  console.log(chalk.green('\nDone.'));
}

/**
 * Shared install helper used by both `init` and `update`.
 *
 * Tool selection follows the same rules as openspec init:
 *   1. If `--tools` was passed, honor it (`all`, `none`, or explicit list).
 *   2. Otherwise, detect which tool directories already exist in the project.
 *      After `openspec init` runs, `.claude/` or `.cursor/` is usually there.
 *   3. If nothing is detected, install to every supported tool — a reasonable
 *      default for --skip-openspec on a fresh project.
 */
export async function installDoccraftSkills(
  projectPath: string,
  toolsArg: string | undefined
): Promise<void> {
  const skills = await getAvailableSkills();
  if (skills.length === 0) {
    console.log(chalk.dim('\nNo skill templates bundled; skipping skill install.'));
    return;
  }

  let tools: SkillTool[];
  if (toolsArg) {
    tools = parseToolsArg(toolsArg);
  } else {
    const detected = await detectInstalledTools(projectPath);
    tools = detected.length > 0 ? detected : [...SUPPORTED_TOOLS];
  }

  if (tools.length === 0) {
    console.log(chalk.dim('\nSkill install: no tools selected (--tools none).'));
    return;
  }

  const spinner = ora(
    `Installing ${skills.length} doccraft skill(s) into ${tools.map((t) => t.name).join(', ')}...`
  ).start();

  try {
    await installSkills(projectPath, tools, skills);
    spinner.succeed(
      `Installed ${skills.length} skill(s) into ${tools.map((t) => t.skillsDir).join(', ')}`
    );
  } catch (error) {
    spinner.fail(`Skill install failed: ${(error as Error).message}`);
    throw error;
  }
}
