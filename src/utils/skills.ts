import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import select from '@inquirer/select';

/**
 * An AI tool that consumes Agent Skills from `{tool.skillsDir}/skills/<name>/SKILL.md`.
 *
 * `rulesDir` is optional and only set for tools that support glob-based auto-
 * attaching rule files (currently Cursor's `.cursor/rules/*.mdc`). Claude Code
 * has no equivalent primitive — skills trigger on description match, so rule
 * stubs would be redundant for it.
 */
export interface SkillTool {
  id: string;
  name: string;
  skillsDir: string;
  rulesDir?: string;
}

export const SUPPORTED_TOOLS: readonly SkillTool[] = [
  { id: 'claude', name: 'Claude Code', skillsDir: '.claude' },
  { id: 'cursor', name: 'Cursor', skillsDir: '.cursor', rulesDir: '.cursor/rules' },
];

const __filename = fileURLToPath(import.meta.url);
// Runtime lives at dist/utils/skills.js → package root is two levels up.
// The templates/ directory ships via the `files` entry in package.json.
const PACKAGE_ROOT = path.resolve(path.dirname(__filename), '..', '..');
export const TEMPLATES_SKILLS_DIR = path.join(PACKAGE_ROOT, 'templates', 'skills');
export const TEMPLATES_RULES_DIR = path.join(PACKAGE_ROOT, 'templates', 'rules');
export const TEMPLATES_DOCS_DIR = path.join(PACKAGE_ROOT, 'templates', 'docs');

/**
 * A skill template on disk, ready to be installed into a project.
 */
export interface SkillTemplate {
  name: string;
  skillFilePath: string;
}

/**
 * A rule template on disk, installed only into tools that support glob-based
 * rule files.
 */
export interface RuleTemplate {
  fileName: string;
  ruleFilePath: string;
}

/**
 * One-line header injected into every generated skill and rule file so users
 * who open them know the file is managed by `doccraft update` and any edits
 * will be overwritten on the next run. Project-specific vocabulary will move
 * to docs/config.yaml in a planned follow-up change so customisations survive
 * update cycles.
 */
export const MANAGED_HEADER =
  '> Managed by **doccraft** — `doccraft update` regenerates this file. ' +
  'Local edits will be overwritten. See `docs/config.yaml` to override ' +
  'project-specific vocabulary and paths without touching this file.\n\n';

/**
 * Inserts MANAGED_HEADER between YAML frontmatter and body. Both skill
 * `.md` and Cursor rule `.mdc` files use the same `---\n...\n---\n` fence,
 * so a single injector handles both.
 */
export function injectManagedHeader(raw: string): string {
  const match = raw.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!match) return MANAGED_HEADER + raw;
  const body = match[2].startsWith('\n') ? match[2].slice(1) : match[2];
  return match[1] + '\n' + MANAGED_HEADER + body;
}

/**
 * Scans `templates/skills/` for skill directories, each containing a SKILL.md.
 */
export async function getAvailableSkills(): Promise<SkillTemplate[]> {
  if (!existsSync(TEMPLATES_SKILLS_DIR)) {
    return [];
  }

  const entries = await readdir(TEMPLATES_SKILLS_DIR, { withFileTypes: true });
  const skills: SkillTemplate[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFilePath = path.join(TEMPLATES_SKILLS_DIR, entry.name, 'SKILL.md');
    if (!existsSync(skillFilePath)) continue;
    skills.push({ name: entry.name, skillFilePath });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scans `templates/rules/` for `.mdc` rule files.
 */
export async function getAvailableRules(): Promise<RuleTemplate[]> {
  if (!existsSync(TEMPLATES_RULES_DIR)) {
    return [];
  }

  const entries = await readdir(TEMPLATES_RULES_DIR, { withFileTypes: true });
  const rules: RuleTemplate[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.mdc')) continue;
    rules.push({
      fileName: entry.name,
      ruleFilePath: path.join(TEMPLATES_RULES_DIR, entry.name),
    });
  }

  return rules.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

/**
 * Resolves the tool selection for `doccraft init` before any subprocess runs.
 *
 * Precedence:
 *   1. If `--tools` was passed, validate + canonicalize (expand `all` to the
 *      explicit list, dedupe, lowercase).
 *   2. If stdin is a TTY, prompt with a 3-choice picker scoped to the tools
 *      doccraft actually targets — not openspec's 28-tool catalog.
 *   3. Otherwise (piped input, CI), default to both supported tools.
 *
 * Why canonicalize instead of passing raw:
 *   - `--tools all` in doccraft means "all doccraft-supported tools" (Claude
 *     Code + Cursor). OpenSpec would interpret `all` as its own 28-tool
 *     catalog, which is a semantic mismatch. Expanding to `claude,cursor`
 *     before forwarding keeps the two tools aligned on what `all` means
 *     in doccraft's context.
 *   - Lowercasing + deduping gives a stable string we can re-use across
 *     the init command (pass to openspec, pass to installDoccraftSkills,
 *     display to the user).
 */
export async function resolveToolSelection(raw: string | undefined): Promise<string> {
  if (raw !== undefined) {
    const lower = raw.trim().toLowerCase();
    if (lower === 'none') return 'none';
    const tools = parseToolsArg(raw);
    return tools.map((t) => t.id).join(',');
  }

  if (!process.stdin.isTTY) {
    return SUPPORTED_TOOLS.map((t) => t.id).join(',');
  }

  const answer = await select({
    message: 'Which AI tool(s) should doccraft set up?',
    choices: [
      { name: 'Claude Code', value: 'claude' },
      { name: 'Cursor', value: 'cursor' },
      { name: 'Both Claude Code and Cursor', value: 'claude,cursor' },
    ],
    default: 'claude,cursor',
  });

  return answer;
}

/**
 * Renders a canonical --tools string as human-readable tool names for the
 * one-line echo in `doccraft init` / `update`.
 */
export function formatToolsArg(toolsArg: string): string {
  if (toolsArg === 'none') return 'none (skip tool-specific install)';
  const ids = toolsArg.split(',');
  const names = ids.map((id) => {
    const tool = SUPPORTED_TOOLS.find((t) => t.id === id);
    return tool?.name ?? id;
  });
  return names.join(', ');
}

/**
 * Parses a --tools argument into a list of SkillTools.
 */
export function parseToolsArg(raw: string): SkillTool[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error('--tools requires a value (e.g. "all", "none", or "claude,cursor")');
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'all') return [...SUPPORTED_TOOLS];
  if (lower === 'none') return [];

  const tokens = trimmed
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  const chosen: SkillTool[] = [];
  const known = new Map(SUPPORTED_TOOLS.map((t) => [t.id, t]));

  for (const token of tokens) {
    const tool = known.get(token);
    if (!tool) {
      const validIds = SUPPORTED_TOOLS.map((t) => t.id).join(', ');
      throw new Error(`Unknown tool '${token}' in --tools. Valid: ${validIds}, all, none`);
    }
    if (!chosen.find((t) => t.id === tool.id)) {
      chosen.push(tool);
    }
  }

  return chosen;
}

/**
 * Detects which supported tools are already set up in the project by checking
 * for their config directory (e.g. `.claude/`, `.cursor/`).
 */
export async function detectInstalledTools(projectPath: string): Promise<SkillTool[]> {
  const detected: SkillTool[] = [];

  for (const tool of SUPPORTED_TOOLS) {
    const toolDir = path.join(projectPath, tool.skillsDir);
    try {
      const info = await stat(toolDir);
      if (info.isDirectory()) detected.push(tool);
    } catch {
      // directory doesn't exist, skip
    }
  }

  return detected;
}

export interface InstalledSkill {
  skill: string;
  tool: string;
  targetPath: string;
}

export interface InstalledRule {
  rule: string;
  tool: string;
  targetPath: string;
}

/**
 * Installs each skill into each tool's skills directory. File content is
 * identical across tools; `MANAGED_HEADER` is injected so users know the
 * file is regenerated by `doccraft update`.
 */
export async function installSkills(
  projectPath: string,
  tools: readonly SkillTool[],
  skills?: readonly SkillTemplate[]
): Promise<InstalledSkill[]> {
  const available = skills ?? (await getAvailableSkills());
  const installed: InstalledSkill[] = [];

  for (const tool of tools) {
    const toolSkillsRoot = path.join(projectPath, tool.skillsDir, 'skills');

    for (const skill of available) {
      const raw = await readFile(skill.skillFilePath, 'utf8');
      const body = injectManagedHeader(raw);
      const targetDir = path.join(toolSkillsRoot, skill.name);
      const targetPath = path.join(targetDir, 'SKILL.md');

      await mkdir(targetDir, { recursive: true });
      await writeFile(targetPath, body, 'utf8');

      installed.push({ skill: skill.name, tool: tool.id, targetPath });
    }
  }

  return installed;
}

/**
 * Installs Cursor-style rule stubs into tools that advertise a `rulesDir`.
 * Claude Code has no equivalent primitive, so rules are skipped for it.
 */
export async function installRules(
  projectPath: string,
  tools: readonly SkillTool[],
  rules?: readonly RuleTemplate[]
): Promise<InstalledRule[]> {
  const available = rules ?? (await getAvailableRules());
  if (available.length === 0) return [];

  const installed: InstalledRule[] = [];

  for (const tool of tools) {
    if (!tool.rulesDir) continue;

    const targetDir = path.join(projectPath, tool.rulesDir);
    await mkdir(targetDir, { recursive: true });

    for (const rule of available) {
      const raw = await readFile(rule.ruleFilePath, 'utf8');
      const body = injectManagedHeader(raw);
      const targetPath = path.join(targetDir, rule.fileName);
      await writeFile(targetPath, body, 'utf8');
      installed.push({ rule: rule.fileName, tool: tool.id, targetPath });
    }
  }

  return installed;
}

async function walkTemplateFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string, relBase: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const rel = relBase ? path.posix.join(relBase, entry.name) : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, rel);
      } else if (entry.isFile()) {
        results.push(rel);
      }
    }
  }

  await walk(root, '');
  return results;
}

/**
 * Seeds `docs/` with starter files that the skills reference (README,
 * backlog.md, queue.md, stories/README.md, adr/README.md). Skips any file
 * that already exists — `doccraft update` must never clobber a user's
 * backlog rows or their project description.
 */
export async function scaffoldDocsIfMissing(projectPath: string): Promise<string[]> {
  if (!existsSync(TEMPLATES_DOCS_DIR)) return [];

  const relativePaths = await walkTemplateFiles(TEMPLATES_DOCS_DIR);
  const created: string[] = [];

  for (const rel of relativePaths) {
    const targetPath = path.join(projectPath, 'docs', rel);
    if (existsSync(targetPath)) continue;
    const body = await readFile(path.join(TEMPLATES_DOCS_DIR, rel), 'utf8');
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, body, 'utf8');
    created.push(path.posix.join('docs', rel));
  }

  return created;
}
