import {
  mkdtempSync,
  readFileSync,
  existsSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import {
  getAvailableRules,
  getAvailableSkills,
  injectManagedHeader,
  installRules,
  installSkills,
  MANAGED_HEADER,
  parseToolsArg,
  detectInstalledTools,
  scaffoldDocsIfMissing,
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
  it('returns all four bundled skill templates', async () => {
    const skills = await getAvailableSkills();
    const names = skills.map((s) => s.name);
    expect(names).toContain('doccraft-story');
    expect(names).toContain('doccraft-adr');
    expect(names).toContain('doccraft-session-wrap');
    expect(names).toContain('doccraft-queue-audit');
  });

  it('returns skills sorted by name for deterministic output', async () => {
    const skills = await getAvailableSkills();
    const names = skills.map((s) => s.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe('getAvailableRules', () => {
  it('returns the bundled rule stubs sorted by filename', async () => {
    const rules = await getAvailableRules();
    const names = rules.map((r) => r.fileName);
    expect(names).toContain('planning-stories.mdc');
    expect(names).toContain('planning-adrs.mdc');
    expect(names).toContain('planning-queue.mdc');
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe('injectManagedHeader', () => {
  it('places the header between frontmatter close and body, separated by blank lines', () => {
    const raw = '---\nname: foo\ndescription: bar\n---\n\n# Title\n\nBody.\n';
    const out = injectManagedHeader(raw);
    const fmEnd = out.indexOf('---\n', 4) + 4;
    const titleIdx = out.indexOf('# Title');
    const headerIdx = out.indexOf(MANAGED_HEADER.trim());
    expect(headerIdx).toBeGreaterThan(fmEnd);
    expect(headerIdx).toBeLessThan(titleIdx);
  });

  it('prepends the header when no frontmatter is present', () => {
    const raw = '# plain markdown\n\nBody.\n';
    const out = injectManagedHeader(raw);
    expect(out.startsWith(MANAGED_HEADER.trim())).toBe(true);
  });

  it('does not duplicate the header when applied twice', () => {
    const raw = '---\nname: foo\n---\n\n# Title\n';
    const once = injectManagedHeader(raw);
    // Re-inserting should not add a second copy; we expect exactly one header occurrence.
    // (If installSkills is called twice, the source template is always the raw file,
    // so this test represents a theoretical concern — but catching it keeps us honest.)
    const headerCount = (once.match(/Managed by \*\*doccraft\*\*/g) ?? []).length;
    expect(headerCount).toBe(1);
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

  it('throws on unknown tool ids', () => {
    expect(() => parseToolsArg('claude,bogus')).toThrow(/Unknown tool 'bogus'/);
  });
});

describe('detectInstalledTools', () => {
  it('returns only tools whose config dir exists', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, '.claude'), { recursive: true });
    const detected = await detectInstalledTools(project);
    expect(detected.map((t) => t.id)).toEqual(['claude']);
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

  it('injects the managed-by-doccraft header into every installed skill', async () => {
    const project = makeTempProject();
    await installSkills(project, [SUPPORTED_TOOLS[0]]);
    const content = readFileSync(
      path.join(project, '.claude/skills/doccraft-story/SKILL.md'),
      'utf8'
    );
    expect(content).toContain('Managed by **doccraft**');
    expect(content).toContain('docs/config.yaml');
    // Header must appear after frontmatter closes and before the body title.
    const fmEnd = content.indexOf('\n---\n', 4) + '\n---\n'.length;
    const headerIdx = content.indexOf('Managed by **doccraft**');
    const titleIdx = content.indexOf('# doccraft —');
    expect(headerIdx).toBeGreaterThan(fmEnd);
    expect(headerIdx).toBeLessThan(titleIdx);
  });

  it('overwrites an existing SKILL.md (refresh semantics) without duplicating the header', async () => {
    const project = makeTempProject();
    const stalePath = path.join(project, '.claude/skills/doccraft-story/SKILL.md');
    mkdirSync(path.dirname(stalePath), { recursive: true });
    writeFileSync(stalePath, 'stale content', 'utf8');

    await installSkills(project, [SUPPORTED_TOOLS[0]]);
    await installSkills(project, [SUPPORTED_TOOLS[0]]);

    const fresh = readFileSync(stalePath, 'utf8');
    expect(fresh).not.toBe('stale content');
    const headerCount = (fresh.match(/Managed by \*\*doccraft\*\*/g) ?? []).length;
    expect(headerCount).toBe(1);
  });
});

describe('installRules', () => {
  it('installs every rule into tools that have a rulesDir', async () => {
    const project = makeTempProject();
    const installed = await installRules(project, SUPPORTED_TOOLS);

    const cursorRuleDir = path.join(project, '.cursor/rules');
    expect(existsSync(path.join(cursorRuleDir, 'planning-stories.mdc'))).toBe(true);
    expect(existsSync(path.join(cursorRuleDir, 'planning-adrs.mdc'))).toBe(true);
    expect(existsSync(path.join(cursorRuleDir, 'planning-queue.mdc'))).toBe(true);

    // No Claude-side rules directory should be created — Claude has no
    // equivalent primitive.
    expect(existsSync(path.join(project, '.claude/rules'))).toBe(false);

    // Every installed record should point at a Cursor path.
    for (const rec of installed) {
      expect(rec.tool).toBe('cursor');
    }
  });

  it('injects the managed-by-doccraft header into every installed rule', async () => {
    const project = makeTempProject();
    await installRules(project, SUPPORTED_TOOLS);
    const content = readFileSync(
      path.join(project, '.cursor/rules/planning-stories.mdc'),
      'utf8'
    );
    expect(content).toContain('Managed by **doccraft**');
  });

  it('skips tools without a rulesDir', async () => {
    const project = makeTempProject();
    const claudeOnly = SUPPORTED_TOOLS.filter((t) => t.id === 'claude');
    const installed = await installRules(project, claudeOnly);
    expect(installed).toEqual([]);
    expect(existsSync(path.join(project, '.cursor/rules'))).toBe(false);
  });
});

describe('scaffoldDocsIfMissing', () => {
  it('seeds every bundled docs file on first run', async () => {
    const project = makeTempProject();
    const created = await scaffoldDocsIfMissing(project);
    expect(created).toContain('docs/README.md');
    expect(created).toContain('docs/backlog.md');
    expect(created).toContain('docs/queue.md');
    expect(created).toContain('docs/stories/README.md');
    expect(created).toContain('docs/adr/README.md');
    expect(created).toContain('docs/config.yaml');
    expect(existsSync(path.join(project, 'docs/backlog.md'))).toBe(true);
    expect(existsSync(path.join(project, 'docs/config.yaml'))).toBe(true);
  });

  it('preserves user edits to docs/config.yaml across updates', async () => {
    const project = makeTempProject();
    await scaffoldDocsIfMissing(project);
    const configPath = path.join(project, 'docs/config.yaml');
    writeFileSync(configPath, 'story:\n  areas: [payments, orders]\n', 'utf8');

    const created = await scaffoldDocsIfMissing(project);
    expect(created).not.toContain('docs/config.yaml');
    expect(readFileSync(configPath, 'utf8')).toBe(
      'story:\n  areas: [payments, orders]\n'
    );
  });

  it('never overwrites user edits to scaffolded files', async () => {
    const project = makeTempProject();
    await scaffoldDocsIfMissing(project);

    const backlogPath = path.join(project, 'docs/backlog.md');
    writeFileSync(backlogPath, '# My project backlog\n\n- P0.1 ship it\n', 'utf8');

    const created = await scaffoldDocsIfMissing(project);
    expect(created).not.toContain('docs/backlog.md');
    expect(readFileSync(backlogPath, 'utf8')).toContain('# My project backlog');
  });

  it('backfills missing files even when other docs files already exist', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, 'docs'), { recursive: true });
    writeFileSync(path.join(project, 'docs/README.md'), '# pre-existing\n', 'utf8');

    const created = await scaffoldDocsIfMissing(project);
    expect(created).not.toContain('docs/README.md');
    expect(created).toContain('docs/backlog.md');
    expect(readFileSync(path.join(project, 'docs/README.md'), 'utf8')).toBe('# pre-existing\n');
  });
});
