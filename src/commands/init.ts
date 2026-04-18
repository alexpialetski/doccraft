import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { runOpenspec } from '../utils/openspec.js';
import {
  detectInstalledTools,
  findStaleCursorSkills,
  formatToolsArg,
  getAvailableRules,
  getAvailableSkills,
  getCanonicalSkillsTool,
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

  const toolsArg = await resolveToolSelection(options.tools);
  console.log(chalk.dim(`Tools: ${formatToolsArg(toolsArg)}`));
  printCursorVersionNoteIfNeeded(toolsArg);
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

  await installDoccraftSkills(resolvedPath, toolsArg);

  console.log(chalk.green('\nDone.'));
}

function printCursorVersionNoteIfNeeded(toolsArg: string): void {
  if (toolsArg === 'none') return;
  const tools = parseToolsArg(toolsArg);
  if (tools.some((t) => t.id === 'cursor')) {
    console.log(
      chalk.dim(
        'Note: Cursor 2.4+ required to auto-discover skills at .claude/skills/.'
      )
    );
  }
}

/**
 * Shared install helper used by both `init` and `update`. Four phases:
 *
 *   1. **Scaffold docs** — seed `docs/README.md`, `docs/backlog.md`,
 *      `docs/queue.md`, `docs/config.yaml`, and the `stories/` + `adr/`
 *      README indexes, but only for files that don't already exist.
 *   2. **Install skills** — every `SKILL.md` lands at `.claude/skills/`
 *      regardless of tool selection (ADR 007). Claude Code reads it
 *      natively; Cursor 2.4+ auto-discovers it. `.cursor/skills/` is
 *      never written.
 *   3. **Install rules** — Cursor-style `.mdc` stubs into `.cursor/rules/`
 *      whenever Cursor is in the tool list. Separate primitive (ADR 003).
 *   4. **Stale-cursor advisory** — if doccraft-owned dirs exist under
 *      `.cursor/skills/` (from a pre-ADR-007 install), print a copy-
 *      pasteable cleanup command. Non-destructive.
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

  const canonicalSkillsTool = getCanonicalSkillsTool();

  const spinner = ora(
    `Installing ${skills.length} skill(s) into ${canonicalSkillsTool.skillsDir}/...`
  ).start();

  try {
    await installSkills(projectPath, [canonicalSkillsTool], skills);
    const installedRules = await installRules(projectPath, tools, rules);

    const skillsSummary = `${skills.length} skill(s) into ${canonicalSkillsTool.skillsDir}`;
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
        '  doccraft no longer writes to .cursor/skills/ (ADR 007); these are left over from a previous install.'
      )
    );
    console.log(
      chalk.dim(
        '  Cursor keeps loading them alongside .claude/skills/ until they are removed.'
      )
    );
    console.log(
      chalk.dim(
        `  Remove manually: rm -r ${stale.map((s) => `.cursor/skills/${s}`).join(' ')}`
      )
    );
  }
}
