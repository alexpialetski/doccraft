import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import {
  VALID_INJECTION_POINTS,
  bakeSkill,
  loadExtensions,
  scaffoldExtensions,
  type LoadedExtension,
} from '../src/utils/extensions.js';

const tempDirs: string[] = [];

function makeTempProject(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'doccraft-ext-'));
  tempDirs.push(dir);
  return dir;
}

interface ExtensionLayout {
  name?: string;
  dirName?: string;
  manifest: string;
  fragments?: Record<string, string>;
  scaffoldFiles?: Record<string, string>;
}

interface BuiltExtension {
  dir: string;
  relPath: string;
}

function makeExtension(project: string, layout: ExtensionLayout): BuiltExtension {
  const dirName = layout.dirName ?? layout.name ?? 'ext';
  const extDir = path.join(project, '.doccraft-ext', dirName);
  mkdirSync(extDir, { recursive: true });
  writeFileSync(path.join(extDir, 'extension.yaml'), layout.manifest, 'utf8');
  if (layout.fragments) {
    for (const [rel, body] of Object.entries(layout.fragments)) {
      const full = path.join(extDir, rel);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, body, 'utf8');
    }
  }
  if (layout.scaffoldFiles) {
    for (const [rel, body] of Object.entries(layout.scaffoldFiles)) {
      const full = path.join(extDir, rel);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, body, 'utf8');
    }
  }
  return { dir: extDir, relPath: path.relative(project, extDir) };
}

function writeConfigWithExtensions(project: string, relPaths: string[]): void {
  writeFileSync(
    path.join(project, 'doccraft.json'),
    JSON.stringify({ extensions: relPaths.map((p) => ({ path: `./${p}` })) }),
    'utf8'
  );
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('VALID_INJECTION_POINTS', () => {
  it('declares exactly the ten v1 points (ADR 013)', () => {
    expect([...VALID_INJECTION_POINTS]).toEqual([
      'story.frontmatter.fields',
      'story.body.sections',
      'story.instructions',
      'adr.frontmatter.fields',
      'adr.body.sections',
      'adr.instructions',
      'queue.instructions',
      'queue.artifact-types',
      'session-wrap.artifact-types',
      'session-wrap.instructions',
    ]);
  });
});

describe('loadExtensions', () => {
  it('returns [] when doccraft.json is missing', async () => {
    const project = makeTempProject();
    expect(await loadExtensions(project)).toEqual([]);
  });

  it('returns [] when extensions field is absent', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ docsDir: 'docs' }),
      'utf8'
    );
    expect(await loadExtensions(project)).toEqual([]);
  });

  it('rejects non-array extensions', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ extensions: { path: 'x' } }),
      'utf8'
    );
    await expect(loadExtensions(project)).rejects.toThrow(/must be an array/);
  });

  it('rejects entries missing path', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ extensions: [{}] }),
      'utf8'
    );
    await expect(loadExtensions(project)).rejects.toThrow(/extensions\[0\].path/);
  });

  it('errors when an extension directory does not exist', async () => {
    const project = makeTempProject();
    writeConfigWithExtensions(project, ['nope/missing']);
    await expect(loadExtensions(project)).rejects.toThrow(/extension not found/);
  });

  it('errors when extension.yaml is missing', async () => {
    const project = makeTempProject();
    const dir = path.join(project, 'ext-no-manifest');
    mkdirSync(dir, { recursive: true });
    writeConfigWithExtensions(project, ['ext-no-manifest']);
    await expect(loadExtensions(project)).rejects.toThrow(/extension manifest missing/);
  });

  it('errors when name field is missing from manifest', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, { manifest: 'version: 0.1.0\n' });
    writeConfigWithExtensions(project, [built.relPath]);
    await expect(loadExtensions(project)).rejects.toThrow(/required field "name"/);
  });

  it('errors on unknown skill in injects', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      manifest:
        'name: bad\ninjects:\n  - skill: doccraft-nope\n    point: story.instructions\n    fragment: ./fragments/a.md\n',
      fragments: { 'fragments/a.md': 'x' },
    });
    writeConfigWithExtensions(project, [built.relPath]);
    await expect(loadExtensions(project)).rejects.toThrow(/unknown skill in bad/);
  });

  it('rejects injects targeting infrastructure skills', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      manifest:
        'name: bad\ninjects:\n  - skill: doccraft-config\n    point: story.instructions\n    fragment: ./fragments/a.md\n',
      fragments: { 'fragments/a.md': 'x' },
    });
    writeConfigWithExtensions(project, [built.relPath]);
    await expect(loadExtensions(project)).rejects.toThrow(
      /Infrastructure skills do not accept injections/
    );
  });

  it('errors on unknown injection point', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      manifest:
        'name: bad\ninjects:\n  - skill: doccraft-story\n    point: story.nope\n    fragment: ./fragments/a.md\n',
      fragments: { 'fragments/a.md': 'x' },
    });
    writeConfigWithExtensions(project, [built.relPath]);
    await expect(loadExtensions(project)).rejects.toThrow(
      /unknown injection point in bad: story.nope/
    );
  });

  it('errors when fragment file is missing', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      manifest:
        'name: bad\ninjects:\n  - skill: doccraft-story\n    point: story.instructions\n    fragment: ./fragments/missing.md\n',
    });
    writeConfigWithExtensions(project, [built.relPath]);
    await expect(loadExtensions(project)).rejects.toThrow(/fragment not found in bad/);
  });

  it('errors when scaffold source is missing', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      manifest: 'name: bad\nscaffold:\n  - source: ./scaffold/ghost\n    target: docs/ghost\n',
    });
    writeConfigWithExtensions(project, [built.relPath]);
    await expect(loadExtensions(project)).rejects.toThrow(/scaffold source not found in bad/);
  });

  it('loads a happy-path extension with both injects and scaffold', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      manifest: [
        'name: alpha',
        'version: 0.1.0',
        'injects:',
        '  - skill: doccraft-story',
        '    point: story.instructions',
        '    fragment: ./fragments/extra.md',
        'scaffold:',
        '  - source: ./scaffold/extra',
        '    target: docs/extra',
        '',
      ].join('\n'),
      fragments: { 'fragments/extra.md': 'Use the registry.' },
      scaffoldFiles: { 'scaffold/extra/README.md': '# extra\n' },
    });
    writeConfigWithExtensions(project, [built.relPath]);
    const loaded = await loadExtensions(project);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('alpha');
    expect(loaded[0].version).toBe('0.1.0');
    expect(loaded[0].injects).toHaveLength(1);
    expect(loaded[0].scaffold).toHaveLength(1);
  });

  it('preserves declaration order across multiple extensions', async () => {
    const project = makeTempProject();
    const first = makeExtension(project, {
      dirName: 'first',
      manifest: 'name: first\n',
    });
    const second = makeExtension(project, {
      dirName: 'second',
      manifest: 'name: second\n',
    });
    writeConfigWithExtensions(project, [first.relPath, second.relPath]);
    const loaded = await loadExtensions(project);
    expect(loaded.map((e) => e.name)).toEqual(['first', 'second']);
  });
});

function buildExtensionForTest(
  project: string,
  name: string,
  injects: Array<{ skill: string; point: string; fragmentName: string; body: string }>
): LoadedExtension {
  const dir = path.join(project, '.doccraft-ext', name);
  mkdirSync(path.join(dir, 'fragments'), { recursive: true });
  for (const inj of injects) {
    writeFileSync(path.join(dir, 'fragments', inj.fragmentName), inj.body, 'utf8');
  }
  return {
    name,
    dir,
    injects: injects.map((inj) => ({
      skill: inj.skill as LoadedExtension['injects'][number]['skill'],
      point: inj.point as LoadedExtension['injects'][number]['point'],
      fragmentPath: path.join(dir, 'fragments', inj.fragmentName),
    })),
    scaffold: [],
  };
}

describe('bakeSkill', () => {
  it('strips a single marker pair when no fragments target the point', async () => {
    const project = makeTempProject();
    const tmpl =
      'Before\n<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\nAfter\n';
    const baked = await bakeSkill(tmpl, 'doccraft-story', []);
    expect(baked).not.toContain('doccraft:inject');
    expect(baked).toBe('Before\nAfter\n');
    expect(project).toBeTruthy();
  });

  it('substitutes a single fragment when one extension targets the point', async () => {
    const project = makeTempProject();
    const ext = buildExtensionForTest(project, 'one', [
      {
        skill: 'doccraft-story',
        point: 'story.instructions',
        fragmentName: 'a.md',
        body: 'Be careful.',
      },
    ]);
    const tmpl =
      'Before\n<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\nAfter\n';
    const baked = await bakeSkill(tmpl, 'doccraft-story', [ext]);
    expect(baked).toContain('Be careful.');
    expect(baked).not.toContain('doccraft:inject');
  });

  it('concatenates multiple fragments in extension declaration order with a blank line between', async () => {
    const project = makeTempProject();
    const a = buildExtensionForTest(project, 'a', [
      {
        skill: 'doccraft-story',
        point: 'story.instructions',
        fragmentName: 'a.md',
        body: 'From A.',
      },
    ]);
    const b = buildExtensionForTest(project, 'b', [
      {
        skill: 'doccraft-story',
        point: 'story.instructions',
        fragmentName: 'b.md',
        body: 'From B.',
      },
    ]);
    const tmpl =
      '<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\n';
    const baked = await bakeSkill(tmpl, 'doccraft-story', [a, b]);
    expect(baked).toContain('From A.\n\nFrom B.');
  });

  it('only injects into the matching skill, ignoring entries targeting other skills', async () => {
    const project = makeTempProject();
    const ext = buildExtensionForTest(project, 'mixed', [
      {
        skill: 'doccraft-adr',
        point: 'adr.instructions',
        fragmentName: 'for-adr.md',
        body: 'ADR-only.',
      },
    ]);
    const tmpl =
      '<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\n';
    const baked = await bakeSkill(tmpl, 'doccraft-story', [ext]);
    expect(baked).not.toContain('ADR-only.');
  });

  it('rejects unknown injection points in the template body', async () => {
    const tmpl =
      '<!-- doccraft:inject point=story.bogus -->\n<!-- /doccraft:inject -->\n';
    await expect(bakeSkill(tmpl, 'doccraft-story', [])).rejects.toThrow(
      /unknown injection point in template/
    );
  });

  it('rejects duplicate markers for the same point in one template', async () => {
    const tmpl =
      '<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\n' +
      '<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\n';
    await expect(bakeSkill(tmpl, 'doccraft-story', [])).rejects.toThrow(
      /duplicate injection marker/
    );
  });

  it('produces byte-identical output across consecutive runs (determinism)', async () => {
    const project = makeTempProject();
    const ext = buildExtensionForTest(project, 'det', [
      {
        skill: 'doccraft-story',
        point: 'story.instructions',
        fragmentName: 'a.md',
        body: 'Stable.',
      },
    ]);
    const tmpl =
      '<!-- doccraft:inject point=story.instructions -->\n<!-- /doccraft:inject -->\n';
    const first = await bakeSkill(tmpl, 'doccraft-story', [ext]);
    const second = await bakeSkill(tmpl, 'doccraft-story', [ext]);
    expect(first).toBe(second);
  });
});

describe('scaffoldExtensions', () => {
  it('copies new files into the target tree', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      dirName: 'scaffold-new',
      manifest:
        'name: scaffold-new\nscaffold:\n  - source: ./scaffold/business\n    target: docs/business\n',
      scaffoldFiles: {
        'scaffold/business/README.md': '# Business\n',
        'scaffold/business/audience.md': '# Audience\n',
      },
    });
    writeConfigWithExtensions(project, [built.relPath]);
    const loaded = await loadExtensions(project);
    const created = await scaffoldExtensions(project, loaded);
    expect(created).toContain('docs/business/README.md');
    expect(created).toContain('docs/business/audience.md');
    expect(
      readFileSync(path.join(project, 'docs/business/audience.md'), 'utf8')
    ).toBe('# Audience\n');
  });

  it('preserves existing files at the target paths', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      dirName: 'scaffold-preserve',
      manifest:
        'name: scaffold-preserve\nscaffold:\n  - source: ./scaffold/business\n    target: docs/business\n',
      scaffoldFiles: {
        'scaffold/business/audience.md': '# default\n',
      },
    });
    mkdirSync(path.join(project, 'docs/business'), { recursive: true });
    writeFileSync(path.join(project, 'docs/business/audience.md'), '# user wrote this\n', 'utf8');
    writeConfigWithExtensions(project, [built.relPath]);
    const loaded = await loadExtensions(project);
    const created = await scaffoldExtensions(project, loaded);
    expect(created).not.toContain('docs/business/audience.md');
    expect(
      readFileSync(path.join(project, 'docs/business/audience.md'), 'utf8')
    ).toBe('# user wrote this\n');
  });

  it('handles a mix of new and existing files in the same scaffold tree', async () => {
    const project = makeTempProject();
    const built = makeExtension(project, {
      dirName: 'scaffold-mixed',
      manifest:
        'name: scaffold-mixed\nscaffold:\n  - source: ./scaffold/biz\n    target: docs/biz\n',
      scaffoldFiles: {
        'scaffold/biz/keep.md': 'default-keep\n',
        'scaffold/biz/add.md': 'default-add\n',
      },
    });
    mkdirSync(path.join(project, 'docs/biz'), { recursive: true });
    writeFileSync(path.join(project, 'docs/biz/keep.md'), 'user-keep\n', 'utf8');
    writeConfigWithExtensions(project, [built.relPath]);
    const loaded = await loadExtensions(project);
    const created = await scaffoldExtensions(project, loaded);
    expect(created).toContain('docs/biz/add.md');
    expect(created).not.toContain('docs/biz/keep.md');
    expect(readFileSync(path.join(project, 'docs/biz/keep.md'), 'utf8')).toBe('user-keep\n');
    expect(existsSync(path.join(project, 'docs/biz/add.md'))).toBe(true);
  });
});
