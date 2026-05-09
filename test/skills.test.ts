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
  applyDocsDir,
  applyModelHintsBlock,
  bumpConfigVersion,
  ensureModelHintsRegistryFile,
  findStaleCursorSkills,
  formatToolsArg,
  getAvailableRules,
  getAvailableSkills,
  getCanonicalSkillsTool,
  injectManagedHeader,
  installRules,
  installSkills,
  MANAGED_HEADER,
  parseToolsArg,
  detectInstalledTools,
  readDocsDirFromConfig,
  readStoryModelHintsFromConfig,
  resolveToolSelection,
  scaffoldDocsIfMissing,
  scaffoldRootConfigIfMissing,
  SUPPORTED_TOOLS,
} from '../src/utils/skills.js';
import { installDoccraftSkills } from '../src/commands/init.js';
import { DOCCRAFT_CONFIG_SCHEMA } from '../src/utils/config-schema.js';

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

describe('readStoryModelHintsFromConfig', () => {
  it('returns undefined when doccraft.json is missing', async () => {
    const project = makeTempProject();
    expect(await readStoryModelHintsFromConfig(project)).toBeUndefined();
  });

  it('returns undefined when story.modelHints is absent', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ story: { areas: [] } }),
      'utf8'
    );
    expect(await readStoryModelHintsFromConfig(project)).toBeUndefined();
  });

  it('returns undefined for empty or whitespace-only modelHints', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ story: { modelHints: '  ' } }),
      'utf8'
    );
    expect(await readStoryModelHintsFromConfig(project)).toBeUndefined();
  });

  it('round-trips a non-empty path', async () => {
    const project = makeTempProject();
    const pathVal = 'docs/reference/model-hints.md';
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ story: { modelHints: pathVal } }),
      'utf8'
    );
    expect(await readStoryModelHintsFromConfig(project)).toBe(pathVal);
  });
});

describe('applyModelHintsBlock', () => {
  it('strips the placeholder when modelHints path is absent', () => {
    const raw = 'Hello{{MODEL_HINTS_INTEGRATION_BLOCK}}Tail';
    expect(applyModelHintsBlock(raw, undefined)).toBe('HelloTail');
  });

  it('injects the block with the configured path', () => {
    const raw = '{{MODEL_HINTS_INTEGRATION_BLOCK}}';
    const out = applyModelHintsBlock(raw, 'planning/hints.md');
    expect(out).toContain('story.modelHints: "planning/hints.md"');
    expect(out).toContain('## Model hints');
    expect(out).not.toContain('{{MODEL_HINTS_INTEGRATION_BLOCK}}');
  });
});

describe('ensureModelHintsRegistryFile', () => {
  it('creates the file from the bundled template when missing', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ story: { modelHints: 'docs/custom-hints.md' } }),
      'utf8'
    );
    const result = await ensureModelHintsRegistryFile(project);
    expect(result.created).toBe('docs/custom-hints.md');
    const abs = path.join(project, 'docs/custom-hints.md');
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs, 'utf8')).toContain('Model hints registry');
  });

  it('does not overwrite an existing registry file', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, 'docs', 'reference'), { recursive: true });
    const target = path.join(project, 'docs/reference/model-hints.md');
    writeFileSync(target, '# Custom registry\n', 'utf8');
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ story: { modelHints: 'docs/reference/model-hints.md' } }),
      'utf8'
    );
    const result = await ensureModelHintsRegistryFile(project);
    expect(result.preserved).toBe('docs/reference/model-hints.md');
    expect(result.created).toBeUndefined();
    expect(readFileSync(target, 'utf8')).toBe('# Custom registry\n');
  });
});

describe('config-schema', () => {
  it('every property in the schema has a description', () => {
    function checkDescriptions(obj: Record<string, unknown>, path: string): void {
      if (obj.properties && typeof obj.properties === 'object') {
        for (const [key, val] of Object.entries(obj.properties as Record<string, unknown>)) {
          const prop = val as Record<string, unknown>;
          expect(prop.description, `${path}.${key} is missing description`).toBeTruthy();
          checkDescriptions(prop, `${path}.${key}`);
        }
      }
    }
    checkDescriptions(DOCCRAFT_CONFIG_SCHEMA as unknown as Record<string, unknown>, 'root');
  });
});

describe('getAvailableSkills', () => {
  it('returns all six bundled skill templates', async () => {
    const skills = await getAvailableSkills();
    const names = skills.map((s) => s.name);
    expect(names).toContain('doccraft-story');
    expect(names).toContain('doccraft-adr');
    expect(names).toContain('doccraft-session-wrap');
    expect(names).toContain('doccraft-queue-audit');
    expect(names).toContain('doccraft-config');
    expect(names).toContain('doccraft-update');
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
    const headerCount = (once.match(/Managed by \*\*doccraft\*\*/g) ?? []).length;
    expect(headerCount).toBe(1);
  });

  it('references doccraft.json (not doccraft.yaml) in the managed header', () => {
    expect(MANAGED_HEADER).toContain('doccraft.json');
    expect(MANAGED_HEADER).not.toContain('doccraft.yaml');
  });
});

describe('resolveToolSelection', () => {
  it('returns a canonical comma-list when --tools is explicit', async () => {
    expect(await resolveToolSelection('claude')).toBe('claude');
    expect(await resolveToolSelection('cursor')).toBe('cursor');
    expect(await resolveToolSelection('claude,cursor')).toBe('claude,cursor');
  });

  it('expands "all" to the full supported-tool list so openspec does not install to its 28-tool catalog', async () => {
    const expanded = await resolveToolSelection('all');
    expect(expanded).toBe(SUPPORTED_TOOLS.map((t) => t.id).join(','));
  });

  it('passes "none" through unchanged so openspec can opt out', async () => {
    expect(await resolveToolSelection('none')).toBe('none');
  });

  it('normalises case + whitespace + duplicates', async () => {
    expect(await resolveToolSelection(' Claude , claude , Cursor ')).toBe('claude,cursor');
  });

  it('throws on unknown tool ids (delegates to parseToolsArg)', async () => {
    await expect(resolveToolSelection('claude,bogus')).rejects.toThrow(/Unknown tool 'bogus'/);
  });

  it('defaults to every supported tool when --tools is absent and stdin is not a TTY', async () => {
    const resolved = await resolveToolSelection(undefined);
    expect(resolved).toBe(SUPPORTED_TOOLS.map((t) => t.id).join(','));
  });
});

describe('getCanonicalSkillsTool', () => {
  it('returns the Claude Code tool (ADR 007 canonical install target)', () => {
    expect(getCanonicalSkillsTool().id).toBe('claude');
  });
});

describe('findStaleCursorSkills', () => {
  it('returns doccraft-owned skill dirs under .cursor/skills/', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, '.cursor/skills/doccraft-story'), { recursive: true });
    mkdirSync(path.join(project, '.cursor/skills/doccraft-adr'), { recursive: true });
    mkdirSync(path.join(project, '.cursor/skills/some-other-skill'), { recursive: true });

    const stale = await findStaleCursorSkills(project);
    expect(stale).toEqual(['doccraft-adr', 'doccraft-story']);
  });

  it('returns [] when .cursor/skills/ does not exist', async () => {
    const project = makeTempProject();
    const stale = await findStaleCursorSkills(project);
    expect(stale).toEqual([]);
  });

  it('returns [] when .cursor/skills/ exists but has no doccraft dirs', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, '.cursor/skills/something-else'), { recursive: true });
    const stale = await findStaleCursorSkills(project);
    expect(stale).toEqual([]);
  });
});

describe('formatToolsArg', () => {
  it('renders tool ids as their human-readable names', () => {
    expect(formatToolsArg('claude')).toBe('Claude Code');
    expect(formatToolsArg('cursor')).toBe('Cursor');
    expect(formatToolsArg('claude,cursor')).toBe('Claude Code, Cursor');
  });

  it('annotates "none" so users know what they asked for', () => {
    expect(formatToolsArg('none')).toContain('none');
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

describe('installDoccraftSkills (ADR 007 default layout)', () => {
  it('scaffolds doccraft.json with story.modelHints and creates the registry file', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude');

    const cfg = JSON.parse(readFileSync(path.join(project, 'doccraft.json'), 'utf8')) as {
      story?: { modelHints?: string };
    };
    expect(cfg.story?.modelHints).toBe('docs/reference/model-hints.md');
    const hintsPath = path.join(project, 'docs/reference/model-hints.md');
    expect(existsSync(hintsPath)).toBe(true);
    expect(readFileSync(hintsPath, 'utf8')).toContain('Model hints registry');
  });

  it('writes skills only to .claude/skills/ even when --tools cursor', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'cursor');

    expect(existsSync(path.join(project, '.claude/skills/doccraft-story/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(project, '.cursor/skills'))).toBe(false);
    // Rules still land at .cursor/rules/ because Cursor is in the selection.
    expect(existsSync(path.join(project, '.cursor/rules/planning-stories.mdc'))).toBe(true);
  });

  it('writes skills only to .claude/skills/ when --tools claude (no .cursor tree at all)', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude');

    expect(existsSync(path.join(project, '.claude/skills/doccraft-story/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(project, '.cursor'))).toBe(false);
  });

  it('writes skills only to .claude/skills/ when --tools claude,cursor (no dual-write)', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude,cursor');

    expect(existsSync(path.join(project, '.claude/skills/doccraft-story/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(project, '.cursor/skills'))).toBe(false);
    expect(existsSync(path.join(project, '.cursor/rules/planning-stories.mdc'))).toBe(true);
  });

  it('installs doccraft-config and doccraft-update alongside the original four skills', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude');

    for (const skill of [
      'doccraft-story',
      'doccraft-adr',
      'doccraft-session-wrap',
      'doccraft-queue-audit',
      'doccraft-config',
      'doccraft-update',
    ]) {
      expect(
        existsSync(path.join(project, `.claude/skills/${skill}/SKILL.md`)),
        `${skill} should be installed`
      ).toBe(true);
    }
  });
});

describe('installSkills', () => {
  it('writes SKILL.md with the managed header for every bundled skill', async () => {
    const project = makeTempProject();
    const installed = await installSkills(project, [SUPPORTED_TOOLS[0]]);

    for (const skill of [
      'doccraft-story',
      'doccraft-adr',
      'doccraft-session-wrap',
      'doccraft-queue-audit',
      'doccraft-config',
      'doccraft-update',
    ]) {
      const claudePath = path.join(project, `.claude/skills/${skill}/SKILL.md`);
      expect(existsSync(claudePath)).toBe(true);
      expect(readFileSync(claudePath, 'utf8')).toContain('Managed by **doccraft**');
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
    expect(content).toContain('doccraft.json');
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

  it('substitutes {{DOCCRAFT_CONFIG_SCHEMA}} in doccraft-config and no placeholder remains', async () => {
    const project = makeTempProject();
    await installSkills(project, [SUPPORTED_TOOLS[0]]);

    const content = readFileSync(
      path.join(project, '.claude/skills/doccraft-config/SKILL.md'),
      'utf8'
    );
    expect(content).not.toContain('{{DOCCRAFT_CONFIG_SCHEMA}}');
    // Installed skill contains JSON Schema content (has the $schema meta key)
    expect(content).toContain('"$schema"');
    expect(content).toContain('## Model hints registry');
    expect(content).toContain('Tailoring flow:');
  });

  it('includes model hints integration when story.modelHints is set', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({
        story: { modelHints: 'docs/reference/model-hints.md' },
      }),
      'utf8'
    );
    await installSkills(project, [SUPPORTED_TOOLS[0]]);
    const content = readFileSync(
      path.join(project, '.claude/skills/doccraft-story/SKILL.md'),
      'utf8'
    );
    expect(content).toContain('## Model hints');
    expect(content).toContain('docs/reference/model-hints.md');
    expect(content).not.toContain('{{MODEL_HINTS_INTEGRATION_BLOCK}}');
  });

  it('omits model hints section when story.modelHints is unset', async () => {
    const project = makeTempProject();
    writeFileSync(path.join(project, 'doccraft.json'), JSON.stringify({ docsDir: 'docs' }), 'utf8');
    await installSkills(project, [SUPPORTED_TOOLS[0]]);
    const content = readFileSync(
      path.join(project, '.claude/skills/doccraft-story/SKILL.md'),
      'utf8'
    );
    expect(content).not.toContain('## Model hints');
    expect(content).not.toContain('{{MODEL_HINTS_INTEGRATION_BLOCK}}');
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

    expect(existsSync(path.join(project, '.claude/rules'))).toBe(false);

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

  it('substitutes default docsDir when no doccraft.json exists', async () => {
    const project = makeTempProject();
    await installRules(project, SUPPORTED_TOOLS);
    const adrs = readFileSync(path.join(project, '.cursor/rules/planning-adrs.mdc'), 'utf8');
    expect(adrs).toContain('globs: docs/adr/**/*.md');
    expect(adrs).not.toContain('{{DOCS_DIR}}');
  });

  it('substitutes custom docsDir from doccraft.json into rule globs', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ docsDir: 'design' }),
      'utf8'
    );
    await installRules(project, SUPPORTED_TOOLS);
    const adrs = readFileSync(path.join(project, '.cursor/rules/planning-adrs.mdc'), 'utf8');
    const stories = readFileSync(
      path.join(project, '.cursor/rules/planning-stories.mdc'),
      'utf8'
    );
    const queue = readFileSync(path.join(project, '.cursor/rules/planning-queue.mdc'), 'utf8');
    expect(adrs).toContain('globs: design/adr/**/*.md');
    expect(stories).toContain('globs: design/stories/**/*.md');
    expect(queue).toContain('globs: design/queue.md');
    expect(adrs).not.toContain('{{DOCS_DIR}}');
  });
});

describe('readDocsDirFromConfig', () => {
  it('returns "docs" when no doccraft.json exists', async () => {
    const project = makeTempProject();
    expect(await readDocsDirFromConfig(project)).toBe('docs');
  });

  it('returns "docs" when doccraft.json has no docsDir key', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ story: { areas: [] } }),
      'utf8'
    );
    expect(await readDocsDirFromConfig(project)).toBe('docs');
  });

  it('returns the configured docsDir', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ docsDir: 'planning' }),
      'utf8'
    );
    expect(await readDocsDirFromConfig(project)).toBe('planning');
  });

  it('does not read doccraft.yaml even if only that file exists', async () => {
    const project = makeTempProject();
    writeFileSync(path.join(project, 'doccraft.yaml'), 'docsDir: planning\n', 'utf8');
    expect(await readDocsDirFromConfig(project)).toBe('docs');
  });
});

describe('applyDocsDir', () => {
  it('replaces all {{DOCS_DIR}} occurrences', () => {
    const raw = 'globs: {{DOCS_DIR}}/adr/**/*.md\nSee {{DOCS_DIR}}/stories/';
    expect(applyDocsDir(raw, 'design')).toBe('globs: design/adr/**/*.md\nSee design/stories/');
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
    expect(created).toContain('docs/reference/model-hints.md');
    expect(existsSync(path.join(project, 'docs/backlog.md'))).toBe(true);
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

  it('uses docsDir from doccraft.json when scaffolding', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ docsDir: 'planning' }),
      'utf8'
    );
    const created = await scaffoldDocsIfMissing(project);
    expect(created).toContain('planning/README.md');
    expect(created).toContain('planning/reference/model-hints.md');
    expect(existsSync(path.join(project, 'planning/queue.md'))).toBe(true);
  });
});

describe('scaffoldRootConfigIfMissing', () => {
  it('creates doccraft.json at project root on first run', async () => {
    const project = makeTempProject();
    const created = await scaffoldRootConfigIfMissing(project);
    expect(created).toBe(true);
    expect(existsSync(path.join(project, 'doccraft.json'))).toBe(true);
    const content = readFileSync(path.join(project, 'doccraft.json'), 'utf8');
    expect(content).toContain('"docsDir"');
  });

  it('does not create doccraft.yaml (only doccraft.json)', async () => {
    const project = makeTempProject();
    await scaffoldRootConfigIfMissing(project);
    expect(existsSync(path.join(project, 'doccraft.yaml'))).toBe(false);
  });

  it('does not overwrite an existing doccraft.json', async () => {
    const project = makeTempProject();
    writeFileSync(path.join(project, 'doccraft.json'), '{"docsDir":"planning"}', 'utf8');
    const created = await scaffoldRootConfigIfMissing(project);
    expect(created).toBe(false);
    expect(readFileSync(path.join(project, 'doccraft.json'), 'utf8')).toBe(
      '{"docsDir":"planning"}'
    );
  });

  it('substitutes {{DOCCRAFT_VERSION}} so version and $schema URL are correct', async () => {
    const project = makeTempProject();
    await scaffoldRootConfigIfMissing(project);
    const content = readFileSync(path.join(project, 'doccraft.json'), 'utf8');
    expect(content).not.toContain('{{DOCCRAFT_VERSION}}');
    const parsed = JSON.parse(content) as { version: string; $schema: string };
    expect(parsed.version).toBeTruthy();
    expect(parsed.$schema).toContain(parsed.version);
  });
});

describe('bumpConfigVersion', () => {
  it('updates version and $schema URL, preserving all other bytes', async () => {
    const project = makeTempProject();
    const original = JSON.stringify(
      {
        $schema:
          'https://cdn.jsdelivr.net/npm/doccraft@0.1.0/schema/doccraft.schema.json',
        version: '0.1.0',
        _hint: 'some hint',
        docsDir: 'docs',
        story: { areas: ['cli'] },
      },
      null,
      2
    );
    writeFileSync(path.join(project, 'doccraft.json'), original, 'utf8');

    await bumpConfigVersion(project, '0.2.0');

    const updated = readFileSync(path.join(project, 'doccraft.json'), 'utf8');
    const parsed = JSON.parse(updated) as { version: string; $schema: string; docsDir: string };
    expect(parsed.version).toBe('0.2.0');
    expect(parsed.$schema).toContain('0.2.0');
    expect(parsed.$schema).not.toContain('0.1.0');
    // Other fields preserved
    expect(parsed.docsDir).toBe('docs');
  });

  it('keeps version and $schema URL in sync after bump', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({
        $schema:
          'https://cdn.jsdelivr.net/npm/doccraft@1.0.0/schema/doccraft.schema.json',
        version: '1.0.0',
      }),
      'utf8'
    );

    await bumpConfigVersion(project, '1.1.0');

    const content = readFileSync(path.join(project, 'doccraft.json'), 'utf8');
    const parsed = JSON.parse(content) as { version: string; $schema: string };
    expect(parsed.version).toBe('1.1.0');
    expect(parsed.$schema).toContain('1.1.0');
    expect(parsed.$schema).not.toContain('1.0.0');
  });

  it('returns false and does nothing when doccraft.json is missing', async () => {
    const project = makeTempProject();
    const result = await bumpConfigVersion(project, '1.0.0');
    expect(result).toBe(false);
  });
});
