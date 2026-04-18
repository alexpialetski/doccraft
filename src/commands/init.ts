import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { runOpenspec } from '../utils/openspec.js';
import {
  detectInstalledTools,
  filterSkillTargets,
  findStaleCursorSkills,
  formatToolsArg,
  getAvailableRules,
  getAvailableSkills,
  installRules,
  installSkills,
  parseToolsArg,
  resolveToolSelection,
  scaffoldDocsIfMissing,
  SUPPORTED_TOOLS,
  validateConsolidate,
  type SkillTool,
} from '../utils/skills.js';

export interface InitOptions {
  tools?: string;
  force?: boolean;
  profile?: string;
  skipOpenspec?: boolean;
  consolidate?: boolean;
}

export async function runInit(targetPath: string, options: InitOptions): Promise<void> {
  const resolvedPath = path.resolve(targetPath);

  console.log(chalk.bold('\ndoccraft init'));
  console.log(chalk.dim(`Target: ${resolvedPath}\n`));

  const toolsArg = await resolveToolSelection(options.tools);
  console.log(chalk.dim(`Tools: ${formatToolsArg(toolsArg)}`));

  if (options.consolidate) {
    validateConsolidate(toolsArg);
    console.log(
      chalk.dim(
        'Consolidate: skills → .claude/skills/ only (Cursor 2.4+ auto-discovers).'
      )
    );
  }
  console.log('');

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

  await installDoccraftSkills(resolvedPath, toolsArg, {
    consolidate: options.consolidate ?? false,
  });

  console.log(chalk.green('\nDone.'));
}

export interface InstallOptions {
  consolidate?: boolean;
}

/**
 * Shared install helper used by both `init` and `update`. Four phases:
 *
 *   1. **Scaffold docs** — seed `docs/README.md`, `docs/backlog.md`,
 *      `docs/queue.md`, `docs/config.yaml`, and the `stories/` + `adr/`
 *      README indexes, but only for files that don't already exist.
 *   2. **Install skills** — SKILL.md into every selected tool's
 *      `skills/` directory, unless `--consolidate` is set, in which case
 *      skills land only under `.claude/skills/` and Cursor 2.4+'s
 *      auto-discovery picks them up (ADR 005).
 *   3. **Install rules** — Cursor-style `.mdc` stubs into `.cursor/rules/`.
 *      Not affected by `--consolidate`: rules are a separate primitive
 *      (ADR 003) and serve Cursor users regardless of the skill-install
 *      layout.
 *   4. **Stale-cursor advisory** — if `--consolidate` is set and the
 *      project already has `.cursor/skills/doccraft-*` from a previous
 *      non-consolidated install, print an advisory. Non-destructive —
 *      the user removes manually when they're ready.
 */
export async function installDoccraftSkills(
  projectPath: string,
  toolsArg: string | undefined,
  options: InstallOptions = {}
): Promise<void> {
  const consolidate = options.consolidate ?? false;

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

  const skillTargets = filterSkillTargets(tools, consolidate);

  const spinner = ora(
    `Installing ${skills.length} skill(s) into ${skillTargets.map((t) => t.name).join(', ')}...`
  ).start();

  try {
    await installSkills(projectPath, skillTargets, skills);
    const installedRules = await installRules(projectPath, tools, rules);

    const skillsSummary = `${skills.length} skill(s) into ${skillTargets.map((t) => t.skillsDir).join(', ')}`;
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

  if (consolidate) {
    const stale = await findStaleCursorSkills(projectPath);
    if (stale.length > 0) {
      console.log('');
      console.log(
        chalk.yellow(
          `⚠ Stale doccraft skills at .cursor/skills/: ${stale.join(', ')}`
        )
      );
      console.log(
        chalk.dim(
          '  Under --consolidate these are no longer written, but Cursor will keep loading them.'
        )
      );
      console.log(
        chalk.dim(
          `  Remove manually: rm -r ${stale.map((s) => `.cursor/skills/${s}`).join(' ')}`
        )
      );
    }
  }
}
