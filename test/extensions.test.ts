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
  loadPackages,
  scaffoldExtensions,
  type LoadedExtension,
  type LoadedPackage,
} from '../src/utils/extensions.js';
import { scaffoldPackages } from '../src/utils/skills.js';

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
  it('declares exactly the v1 points (ADR 013) plus the close points (ADR 015)', () => {
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
      'close.instructions',
      'close.epic-update',
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

function writeConfigWithPackages(project: string, paths: string[]): void {
  writeFileSync(
    path.join(project, 'doccraft.json'),
    JSON.stringify({ packages: paths.map((p) => ({ path: p })) }),
    'utf8'
  );
}

describe('loadPackages', () => {
  it('returns [] when doccraft.json is missing', async () => {
    const project = makeTempProject();
    expect(await loadPackages(project)).toEqual([]);
  });

  it('returns [] when packages field is absent', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ docsDir: 'docs' }),
      'utf8'
    );
    expect(await loadPackages(project)).toEqual([]);
  });

  it('returns [] for an empty packages array', async () => {
    const project = makeTempProject();
    writeConfigWithPackages(project, []);
    expect(await loadPackages(project)).toEqual([]);
  });

  it('rejects a non-array packages value', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ packages: { path: 'x' } }),
      'utf8'
    );
    await expect(loadPackages(project)).rejects.toThrow(/must be an array/);
  });

  it('rejects entries with missing path', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ packages: [{}] }),
      'utf8'
    );
    await expect(loadPackages(project)).rejects.toThrow(/packages\[0\].path/);
  });

  it('rejects non-string path values', async () => {
    const project = makeTempProject();
    writeFileSync(
      path.join(project, 'doccraft.json'),
      JSON.stringify({ packages: [{ path: 42 }] }),
      'utf8'
    );
    await expect(loadPackages(project)).rejects.toThrow(/non-empty string/);
  });

  it('derives slug as the basename of the path', async () => {
    const project = makeTempProject();
    writeConfigWithPackages(project, ['packages/audio-engine', 'services/foo']);
    const loaded = await loadPackages(project);
    expect(loaded.map((p) => p.slug)).toEqual(['audio-engine', 'foo']);
    expect(loaded.map((p) => p.path)).toEqual(['packages/audio-engine', 'services/foo']);
  });

  it('rejects duplicate slugs across distinct paths', async () => {
    const project = makeTempProject();
    writeConfigWithPackages(project, ['packages/a/foo', 'services/b/foo']);
    await expect(loadPackages(project)).rejects.toThrow(/duplicate package slug "foo"/);
  });

  it('does not require declared package directories to exist on disk', async () => {
    const project = makeTempProject();
    writeConfigWithPackages(project, ['packages/will-be-scaffolded']);
    const loaded = await loadPackages(project);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].slug).toBe('will-be-scaffolded');
  });
});

describe('bakeSkill — packages directive', () => {
  it('strips the marker pair when packages is empty', async () => {
    const tmpl =
      'Before\n<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\nAfter\n';
    const baked = await bakeSkill(tmpl, 'doccraft-story', [], []);
    expect(baked).not.toContain('doccraft:packages');
    expect(baked).toBe('Before\nAfter\n');
  });

  it('produces byte-identical output regardless of marker presence when packages is empty', async () => {
    const withMarker =
      'Before\n<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\nAfter\n';
    const without = 'Before\nAfter\n';
    const bakedWith = await bakeSkill(withMarker, 'doccraft-story', [], []);
    expect(bakedWith).toBe(without);
  });

  it('renders the package list when packages is non-empty', async () => {
    const tmpl = '<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\n';
    const packages: LoadedPackage[] = [
      { slug: 'audio-engine', path: 'packages/audio-engine' },
      { slug: 'ui-shell', path: 'packages/ui-shell' },
    ];
    const baked = await bakeSkill(tmpl, 'doccraft-story', [], packages);
    expect(baked).toContain('## Known package roots');
    expect(baked).toContain('`audio-engine` — `packages/audio-engine/{{DOCS_DIR}}/`');
    expect(baked).toContain('`ui-shell` — `packages/ui-shell/{{DOCS_DIR}}/`');
    expect(baked).not.toContain('doccraft:packages');
  });

  it('renders packages in declaration order', async () => {
    const tmpl = '<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\n';
    const packages: LoadedPackage[] = [
      { slug: 'second', path: 'packages/second' },
      { slug: 'first', path: 'packages/first' },
    ];
    const baked = await bakeSkill(tmpl, 'doccraft-story', [], packages);
    const secondIdx = baked.indexOf('`second`');
    const firstIdx = baked.indexOf('`first`');
    expect(secondIdx).toBeGreaterThan(0);
    expect(firstIdx).toBeGreaterThan(secondIdx);
  });

  it('rejects duplicate doccraft:packages markers in one template', async () => {
    const tmpl =
      '<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\n' +
      '<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\n';
    await expect(bakeSkill(tmpl, 'doccraft-story', [], [])).rejects.toThrow(
      /duplicate doccraft:packages marker/
    );
  });

  it('rejects unknown directive names', async () => {
    const tmpl =
      '<!-- doccraft:pakcages -->\n<!-- /doccraft:pakcages -->\n';
    await expect(bakeSkill(tmpl, 'doccraft-story', [], [])).rejects.toThrow(
      /unknown doccraft directive/
    );
  });

  it('processes mixed inject + packages markers independently', async () => {
    const project = makeTempProject();
    const ext = buildExtensionForTest(project, 'mix', [
      {
        skill: 'doccraft-story',
        point: 'story.instructions',
        fragmentName: 'a.md',
        body: 'Injected.',
      },
    ]);
    const tmpl =
      '<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\n' +
      'middle\n' +
      '<!-- doccraft:inject point=story.instructions -->\n' +
      '<!-- /doccraft:inject -->\n';
    const packages: LoadedPackage[] = [{ slug: 'pkg', path: 'packages/pkg' }];
    const baked = await bakeSkill(tmpl, 'doccraft-story', [ext], packages);
    expect(baked).toContain('Known package roots');
    expect(baked).toContain('Injected.');
    expect(baked).not.toContain('doccraft:packages');
    expect(baked).not.toContain('doccraft:inject');
  });

  it('is deterministic across runs when packages is non-empty', async () => {
    const tmpl = '<!-- doccraft:packages -->\n<!-- /doccraft:packages -->\n';
    const packages: LoadedPackage[] = [{ slug: 'a', path: 'packages/a' }];
    const first = await bakeSkill(tmpl, 'doccraft-story', [], packages);
    const second = await bakeSkill(tmpl, 'doccraft-story', [], packages);
    expect(first).toBe(second);
  });
});

describe('scaffoldPackages', () => {
  it('scaffolds the bundled templates/docs skeleton under each declared package', async () => {
    const project = makeTempProject();
    const packages: LoadedPackage[] = [
      { slug: 'pkg-a', path: 'packages/pkg-a' },
      { slug: 'pkg-b', path: 'packages/pkg-b' },
    ];
    const created = await scaffoldPackages(project, packages, 'docs');
    expect(created).toContain('packages/pkg-a/docs/README.md');
    expect(created).toContain('packages/pkg-a/docs/queue.md');
    expect(created).toContain('packages/pkg-a/docs/backlog.md');
    expect(created).toContain('packages/pkg-b/docs/README.md');
    expect(existsSync(path.join(project, 'packages/pkg-a/docs/queue.md'))).toBe(true);
    expect(existsSync(path.join(project, 'packages/pkg-b/docs/stories/README.md'))).toBe(true);
  });

  it('preserves existing per-package docs files', async () => {
    const project = makeTempProject();
    mkdirSync(path.join(project, 'packages/keep/docs'), { recursive: true });
    writeFileSync(
      path.join(project, 'packages/keep/docs/queue.md'),
      '# pre-existing\n',
      'utf8'
    );
    const packages: LoadedPackage[] = [{ slug: 'keep', path: 'packages/keep' }];
    const created = await scaffoldPackages(project, packages, 'docs');
    expect(created).not.toContain('packages/keep/docs/queue.md');
    expect(created).toContain('packages/keep/docs/README.md');
    expect(
      readFileSync(path.join(project, 'packages/keep/docs/queue.md'), 'utf8')
    ).toBe('# pre-existing\n');
  });

  it('returns an empty list when packages is empty', async () => {
    const project = makeTempProject();
    const created = await scaffoldPackages(project, [], 'docs');
    expect(created).toEqual([]);
  });

  it('honours a custom docsDir under each package path', async () => {
    const project = makeTempProject();
    const packages: LoadedPackage[] = [{ slug: 'p', path: 'packages/p' }];
    const created = await scaffoldPackages(project, packages, 'planning');
    expect(created).toContain('packages/p/planning/README.md');
    expect(existsSync(path.join(project, 'packages/p/planning/queue.md'))).toBe(true);
  });
});
