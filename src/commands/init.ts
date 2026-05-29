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
  readDocsDirFromConfig,
  resolveToolSelection,
  scaffoldDocsIfMissing,
  scaffoldPackages,
  scaffoldRootConfigIfMissing,
  SUPPORTED_TOOLS,
  type SkillTool,
} from '../utils/skills.js';
import { loadExtensions, loadPackages, scaffoldExtensions } from '../utils/extensions.js';

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
 * Shared install helper used by both `init` and `update`. Phases:
 *
 *   1. **Scaffold config + docs** — write `doccraft.json` at project root
 *      and seed the bundled `docs/` skeleton, skipping existing files.
 *   2. **Load extensions** — parse `doccraft.json.extensions[]` and
 *      validate every declared manifest. Hard-errors on malformed entries.
 *   3. **Install skills** — every `SKILL.md` lands at `.claude/skills/`
 *      (ADR 007). Extension fragments are baked into skill bodies at
 *      `<!-- doccraft:inject -->` markers in declaration order.
 *   4. **Install rules** — Cursor-style `.mdc` stubs into `.cursor/rules/`
 *      whenever Cursor is in the tool list (ADR 003).
 *   5. **Scaffold extension content** — copy each extension's declared
 *      `scaffold[]` source trees into the project, skipping existing files.
 *   6. **Stale-cursor advisory** — non-destructive cleanup hint when
 *      doccraft-owned dirs linger under `.cursor/skills/` from old installs.
 */
export async function installDoccraftSkills(
  projectPath: string,
  toolsArg: string | undefined
): Promise<void> {
  const rootConfigCreated = await scaffoldRootConfigIfMissing(projectPath);
  const scaffolded = await scaffoldDocsIfMissing(projectPath);
  const allCreated = rootConfigCreated ? ['doccraft.json', ...scaffolded] : scaffolded;
  if (allCreated.length > 0) {
    console.log(chalk.dim(`\nScaffolded ${allCreated.length} file(s): ${allCreated.join(', ')}`));
  }

  const docsDir = await readDocsDirFromConfig(projectPath);
  const extensions = await loadExtensions(projectPath);
  if (extensions.length > 0) {
    console.log(
      chalk.dim(`\nLoaded ${extensions.length} extension(s): ${extensions.map((e) => e.name).join(', ')}`)
    );
  }
  const packages = await loadPackages(projectPath);
  if (packages.length > 0) {
    console.log(
      chalk.dim(`\nLoaded ${packages.length} package(s): ${packages.map((p) => p.slug).join(', ')}`)
    );
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
    await installSkills(projectPath, [canonicalSkillsTool], skills, docsDir, extensions, packages);
    const installedRules = await installRules(projectPath, tools, rules, docsDir);

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

  if (extensions.length > 0) {
    const created = await scaffoldExtensions(projectPath, extensions);
    if (created.length > 0) {
      console.log(
        chalk.dim(`\nScaffolded ${created.length} extension file(s): ${created.join(', ')}`)
      );
    }
  }

  if (packages.length > 0) {
    const created = await scaffoldPackages(projectPath, packages, docsDir);
    if (created.length > 0) {
      console.log(
        chalk.dim(`\nScaffolded ${created.length} package docs file(s): ${created.join(', ')}`)
      );
    }
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
