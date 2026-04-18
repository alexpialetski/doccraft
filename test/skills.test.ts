import { mkdtempSync, readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import {
  getAvailableSkills,
  installSkills,
  parseToolsArg,
  detectInstalledTools,
  SUPPORTED_TOOLS,
} from '../src/utils/skills.js';

const tempDirs: string[] = [];

function makeTempProject(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'doccraft-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('getAvailableSkills', () => {
  it('returns the bundled skill templates', async () => {
    const skills = await getAvailableSkills();
    expect(skills.length).toBeGreaterThan(0);
    const names = skills.map((s) => s.name);
    expect(names).toContain('doccraft-story');
    expect(names).toContain('doccraft-adr');
    expect(names).toContain('doccraft-session-wrap');
    expect(names).toContain('doccraft-queue-audit');
    const story = skills.find((s) => s.name === 'doccraft-story');
    expect(story?.skillFilePath).toMatch(/templates\/skills\/doccraft-story\/SKILL\.md$/);
  });

  it('returns skills sorted by name for deterministic output', async () => {
    const skills = await getAvailableSkills();
    const names = skills.map((s) => s.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe('parseToolsArg', () => {
  it('resolves "all" to every supported tool', () => {
    expect(parseToolsArg('all').map((t) => t.id)).toEqual(SUPPORTED_TOOLS.map((t) => t.id));
  });

  it('resolves "none" to an empty list', () => {
    expect(parseToolsArg('none')).toEqual([]);
  });

  it('accepts a comma-separated list with whitespace and case variation', () => {
    const tools = parseToolsArg(' Claude , cursor ');
    expect(tools.map((t) => t.id)).toEqual(['claude', 'cursor']);
  });

  it('deduplicates repeated tool ids', () => {
    const tools = parseToolsArg('claude,claude,cursor');
    expect(tools.map((t) => t.id)).toEqual(['claude', 'cursor']);
  });

  it('throws on unknown tool ids', () => {
    expect(() => parseToolsArg('claude,bogus')).toThrow(/Unknown tool 'bogus'/);
  });

  it('throws on empty input', () => {
    expect(() => parseToolsArg('   ')).toThrow(/requires a value/);
  });
});

describe('detectInstalledTools', () => {
  it('returns only tools whose config dir exists', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, '.claude'), { recursive: true });

    const detected = await detectInstalledTools(project);
    expect(detected.map((t) => t.id)).toEqual(['claude']);
  });

  it('returns an empty list when no tool dirs exist', async () => {
    const project = makeTempProject();
    const detected = await detectInstalledTools(project);
    expect(detected).toEqual([]);
  });
});

describe('installSkills', () => {
  it('writes identical SKILL.md content for every bundled skill into each tool', async () => {
    const project = makeTempProject();
    const installed = await installSkills(project, SUPPORTED_TOOLS);

    for (const skill of [
      'doccraft-story',
      'doccraft-adr',
      'doccraft-session-wrap',
      'doccraft-queue-audit',
    ]) {
      const claudePath = path.join(project, `.claude/skills/${skill}/SKILL.md`);
      const cursorPath = path.join(project, `.cursor/skills/${skill}/SKILL.md`);

      expect(existsSync(claudePath)).toBe(true);
      expect(existsSync(cursorPath)).toBe(true);
      expect(readFileSync(claudePath, 'utf8')).toBe(readFileSync(cursorPath, 'utf8'));

      expect(installed.map((i) => ({ skill: i.skill, tool: i.tool }))).toContainEqual({
        skill,
        tool: 'claude',
      });
    }
  });

  it('overwrites an existing SKILL.md (refresh semantics)', async () => {
    const project = makeTempProject();
    const stalePath = path.join(project, '.claude/skills/doccraft-story/SKILL.md');
    mkdirSync(path.dirname(stalePath), { recursive: true });
    writeFileSync(stalePath, 'stale content', 'utf8');

    await installSkills(project, [SUPPORTED_TOOLS[0]]);

    const fresh = readFileSync(stalePath, 'utf8');
    expect(fresh).not.toBe('stale content');
    expect(fresh).toMatch(/^---\nname: doccraft-story/);
  });
});
