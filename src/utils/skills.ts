import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * An AI tool that consumes Agent Skills from `{tool.skillsDir}/skills/<name>/SKILL.md`.
 *
 * doccraft currently targets Claude Code and Cursor. Additional tools from
 * OpenSpec's catalog (Cline, Codex, Windsurf, ...) can be added later by
 * extending this list — the install pipeline itself is tool-agnostic.
 */
export interface SkillTool {
  id: string;
  name: string;
  skillsDir: string;
}

export const SUPPORTED_TOOLS: readonly SkillTool[] = [
  { id: 'claude', name: 'Claude Code', skillsDir: '.claude' },
  { id: 'cursor', name: 'Cursor', skillsDir: '.cursor' },
];

const __filename = fileURLToPath(import.meta.url);
// Runtime lives at dist/utils/skills.js → package root is two levels up.
// The templates/ directory ships via the `files` entry in package.json.
const PACKAGE_ROOT = path.resolve(path.dirname(__filename), '..', '..');
export const TEMPLATES_SKILLS_DIR = path.join(PACKAGE_ROOT, 'templates', 'skills');

/**
 * A skill template on disk, ready to be installed into a project.
 */
export interface SkillTemplate {
  name: string;
  skillFilePath: string;
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
 * Parses a --tools argument into a list of SkillTools.
 *
 * - `"all"` → every supported tool.
 * - `"none"` → empty list (skip skill install entirely).
 * - `"claude,cursor"` → named tools, validated against SUPPORTED_TOOLS.
 *
 * Unknown tool ids throw rather than silently skipping, so the user notices
 * typos immediately.
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
 *
 * Used when the user did not pass --tools explicitly. By the time this runs,
 * `openspec init` has usually created these directories already.
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

/**
 * Installs each skill into each tool's skills directory.
 *
 * Writes identical content — Claude Code and Cursor both consume the same
 * `SKILL.md` format, so the file is byte-equal across tools. Any existing
 * file at the target path is overwritten; that is intentional for both
 * `doccraft init` (first-time install) and `doccraft update` (refresh).
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
      const body = await readFile(skill.skillFilePath, 'utf8');
      const targetDir = path.join(toolSkillsRoot, skill.name);
      const targetPath = path.join(targetDir, 'SKILL.md');

      await mkdir(targetDir, { recursive: true });
      await writeFile(targetPath, body, 'utf8');

      installed.push({ skill: skill.name, tool: tool.id, targetPath });
    }
  }

  return installed;
}
