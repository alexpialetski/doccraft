import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { runOpenspec } from '../utils/openspec.js';
import {
  detectInstalledTools,
  formatToolsArg,
  getAvailableRules,
  getAvailableSkills,
  installRules,
  installSkills,
  parseToolsArg,
  resolveToolSelection,
  scaffoldDocsIfMissing,
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

  // Resolve the tool selection up front so openspec and doccraft agree on it
  // and the user never sees openspec's 28-tool picker as the first interactive
  // moment of a doccraft install.
  const toolsArg = await resolveToolSelection(options.tools);
  console.log(chalk.dim(`Tools: ${formatToolsArg(toolsArg)}\n`));

  if (!options.skipOpenspec) {
    const openspecArgs = ['init', resolvedPath, '--tools', toolsArg];
    if (options.force) openspecArgs.push('--force');
    if (options.profile) openspecArgs.push('--profile', options.profile);

    const code = await runOpenspec(openspecArgs);
    if (code !== 0) {
      throw new Error(`openspec init exited with code ${code}`);
    }
  } else {
    console.log(chalk.dim('Skipping openspec init (--skip-openspec)'));
  }

  await installDoccraftSkills(resolvedPath, toolsArg);

  console.log(chalk.green('\nDone.'));
}

/**
 * Shared install helper used by both `init` and `update`. Three phases:
 *
 *   1. **Scaffold docs** — seed `docs/README.md`, `docs/backlog.md`,
 *      `docs/queue.md`, `docs/config.yaml`, and the `stories/` + `adr/`
 *      README indexes, but only for files that don't already exist.
 *      `doccraft update` must never overwrite user content here.
 *   2. **Install skills** — byte-identical SKILL.md into every selected
 *      tool's `skills/` directory, with a MANAGED_HEADER injected so
 *      users know the file is regenerated on update.
 *   3. **Install rules** — Cursor-style `.mdc` stubs into `.cursor/rules/`
 *      only. Claude Code has no rules primitive.
 *
 * Tool selection precedence:
 *   - `toolsArg` passed explicitly (from `init`'s resolveToolSelection or
 *     from `update`'s forwarded `--tools` flag).
 *   - Otherwise, detect which tool directories already exist in the
 *     project (useful for `update` on an existing install).
 *   - If nothing is detected, install to every supported tool.
 */
export async function installDoccraftSkills(
  projectPath: string,
  toolsArg: string | undefined
): Promise<void> {
  const scaffolded = await scaffoldDocsIfMissing(projectPath);
  if (scaffolded.length > 0) {
    console.log(chalk.dim(`\nScaffolded ${scaffolded.length} docs file(s): ${scaffolded.join(', ')}`));
  }

  const skills = await getAvailableSkills();
  const rules = await getAvailableRules();
  if (skills.length === 0 && rules.length === 0) {
    console.log(chalk.dim('\nNo skill or rule templates bundled; skipping.'));
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
    `Installing ${skills.length} skill(s) into ${tools.map((t) => t.name).join(', ')}...`
  ).start();

  try {
    await installSkills(projectPath, tools, skills);
    const installedRules = await installRules(projectPath, tools, rules);

    const skillsSummary = `${skills.length} skill(s) into ${tools.map((t) => t.skillsDir).join(', ')}`;
    if (installedRules.length > 0) {
      const toolsWithRules = tools.filter((t) => t.rulesDir);
      spinner.succeed(
        `Installed ${skillsSummary} + ${rules.length} rule(s) into ${toolsWithRules
          .map((t) => t.rulesDir!)
          .join(', ')}`
      );
    } else {
      spinner.succeed(`Installed ${skillsSummary}`);
    }
  } catch (error) {
    spinner.fail(`Install failed: ${(error as Error).message}`);
    throw error;
  }
}
