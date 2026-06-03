import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * The fixed v1 set of injection points. Extensions targeting any other point
 * are rejected at load time.
 *
 * Per ADR 013: adding a value is a non-breaking change; removing a value is
 * breaking. The content skills own these points — `doccraft-config` and
 * `doccraft-update` are infrastructure skills and have no points in v1.
 * `close.*` added per ADR 015 (the `doccraft-close` skill).
 */
export const VALID_INJECTION_POINTS = [
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
] as const;

export type InjectionPoint = (typeof VALID_INJECTION_POINTS)[number];

/** Skill names that may host injections. */
export const INJECTABLE_SKILLS = [
  'doccraft-story',
  'doccraft-adr',
  'doccraft-queue-audit',
  'doccraft-session-wrap',
  'doccraft-close',
] as const;

export type InjectableSkill = (typeof INJECTABLE_SKILLS)[number];

export interface InjectEntry {
  skill: InjectableSkill;
  point: InjectionPoint;
  /** Absolute path to the fragment file. */
  fragmentPath: string;
}

export interface ScaffoldEntry {
  /** Absolute path to the scaffold source root. */
  sourcePath: string;
  /** Project-root-relative target path. */
  target: string;
}

export interface LoadedExtension {
  name: string;
  version?: string;
  /** Absolute path to the extension directory. */
  dir: string;
  injects: InjectEntry[];
  scaffold: ScaffoldEntry[];
}

/**
 * A declared monorepo package opting into doccraft planning. Slug is the
 * last segment of the declared path and is used as the namespace prefix in
 * `pkg/STR-NNNN` / `pkg/NNN-...md` references.
 */
export interface LoadedPackage {
  slug: string;
  /** Project-root-relative path as declared in doccraft.json. */
  path: string;
}

interface RawManifest {
  name?: unknown;
  version?: unknown;
  injects?: unknown;
  scaffold?: unknown;
}

interface RawInject {
  skill?: unknown;
  point?: unknown;
  fragment?: unknown;
}

interface RawScaffold {
  source?: unknown;
  target?: unknown;
}

/**
 * Reads `doccraft.json.extensions[]`, walks each declared directory, parses
 * its `extension.yaml`, and returns validated `LoadedExtension` objects in
 * declaration order. Any malformed entry, unknown injection point, unknown
 * skill, or missing file path causes a hard error — never a silent skip.
 */
export async function loadExtensions(projectPath: string): Promise<LoadedExtension[]> {
  const configPath = path.join(projectPath, 'doccraft.json');
  if (!existsSync(configPath)) return [];

  let cfg: Record<string, unknown>;
  try {
    const raw = await readFile(configPath, 'utf8');
    cfg = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`failed to read doccraft.json: ${(err as Error).message}`);
  }

  const declared = cfg['extensions'];
  if (declared === undefined) return [];
  if (!Array.isArray(declared)) {
    throw new Error('doccraft.json: "extensions" must be an array');
  }

  const loaded: LoadedExtension[] = [];
  for (let i = 0; i < declared.length; i++) {
    const entry = declared[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`doccraft.json: extensions[${i}] must be an object with a "path" field`);
    }
    const rawPath = (entry as Record<string, unknown>)['path'];
    if (typeof rawPath !== 'string' || rawPath.length === 0) {
      throw new Error(`doccraft.json: extensions[${i}].path must be a non-empty string`);
    }
    loaded.push(await loadOneExtension(projectPath, rawPath));
  }
  return loaded;
}

async function loadOneExtension(projectPath: string, relPath: string): Promise<LoadedExtension> {
  const extDir = path.resolve(projectPath, relPath);
  if (!existsSync(extDir)) {
    throw new Error(`extension not found: ${relPath}`);
  }

  const manifestPath = path.join(extDir, 'extension.yaml');
  if (!existsSync(manifestPath)) {
    throw new Error(`extension manifest missing: ${path.posix.join(relPath, 'extension.yaml')}`);
  }

  let parsed: unknown;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`invalid extension manifest at ${relPath}: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`invalid extension manifest at ${relPath}: top-level value must be an object`);
  }

  const m = parsed as RawManifest;
  if (typeof m.name !== 'string' || m.name.length === 0) {
    throw new Error(`invalid extension manifest at ${relPath}: required field "name" missing or empty`);
  }
  const name = m.name;

  if (m.version !== undefined && typeof m.version !== 'string') {
    throw new Error(`invalid extension manifest at ${relPath}: "version" must be a string when present`);
  }
  const version = typeof m.version === 'string' ? m.version : undefined;

  const injects = validateInjects(m.injects, name, extDir);
  const scaffold = validateScaffold(m.scaffold, name, extDir);

  return { name, version, dir: extDir, injects, scaffold };
}

function validateInjects(raw: unknown, extName: string, extDir: string): InjectEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new Error(`invalid extension manifest in ${extName}: "injects" must be an array`);
  }
  const injectableSet = new Set<string>(INJECTABLE_SKILLS);
  const pointSet = new Set<string>(VALID_INJECTION_POINTS);
  const result: InjectEntry[] = [];

  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`invalid extension manifest in ${extName}: injects[${i}] must be an object`);
    }
    const r = entry as RawInject;
    if (typeof r.skill !== 'string' || r.skill.length === 0) {
      throw new Error(`invalid extension manifest in ${extName}: injects[${i}].skill missing or not a string`);
    }
    if (typeof r.point !== 'string' || r.point.length === 0) {
      throw new Error(`invalid extension manifest in ${extName}: injects[${i}].point missing or not a string`);
    }
    if (typeof r.fragment !== 'string' || r.fragment.length === 0) {
      throw new Error(`invalid extension manifest in ${extName}: injects[${i}].fragment missing or not a string`);
    }

    if (r.skill === 'doccraft-config' || r.skill === 'doccraft-update') {
      throw new Error(
        `unknown skill in ${extName}: ${r.skill}. Infrastructure skills do not accept injections in v1.`
      );
    }
    if (!injectableSet.has(r.skill)) {
      throw new Error(
        `unknown skill in ${extName}: ${r.skill}. Valid: ${[...INJECTABLE_SKILLS].join(', ')}`
      );
    }
    if (!pointSet.has(r.point)) {
      throw new Error(
        `unknown injection point in ${extName}: ${r.point}. Valid: ${[...VALID_INJECTION_POINTS].join(', ')}`
      );
    }

    const fragmentPath = path.resolve(extDir, r.fragment);
    if (!existsSync(fragmentPath)) {
      throw new Error(`fragment not found in ${extName}: ${r.fragment}`);
    }

    result.push({
      skill: r.skill as InjectableSkill,
      point: r.point as InjectionPoint,
      fragmentPath,
    });
  }
  return result;
}

function validateScaffold(raw: unknown, extName: string, extDir: string): ScaffoldEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new Error(`invalid extension manifest in ${extName}: "scaffold" must be an array`);
  }
  const result: ScaffoldEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`invalid extension manifest in ${extName}: scaffold[${i}] must be an object`);
    }
    const r = entry as RawScaffold;
    if (typeof r.source !== 'string' || r.source.length === 0) {
      throw new Error(`invalid extension manifest in ${extName}: scaffold[${i}].source missing or not a string`);
    }
    if (typeof r.target !== 'string' || r.target.length === 0) {
      throw new Error(`invalid extension manifest in ${extName}: scaffold[${i}].target missing or not a string`);
    }
    const sourcePath = path.resolve(extDir, r.source);
    if (!existsSync(sourcePath)) {
      throw new Error(`scaffold source not found in ${extName}: ${r.source}`);
    }
    result.push({ sourcePath, target: r.target });
  }
  return result;
}

/**
 * Reads `doccraft.json.packages[]` and returns validated `LoadedPackage`
 * entries in declaration order. Slugs (the last segment of each declared
 * path) must be unique across the manifest; duplicates abort with a hard
 * error naming both colliding paths. Unlike extensions, package directories
 * are NOT validated for existence at load time — `doccraft update` scaffolds
 * the docs/ tree under each declared package, so the directory may not yet
 * exist when the user first declares it.
 */
export async function loadPackages(projectPath: string): Promise<LoadedPackage[]> {
  const configPath = path.join(projectPath, 'doccraft.json');
  if (!existsSync(configPath)) return [];

  let cfg: Record<string, unknown>;
  try {
    const raw = await readFile(configPath, 'utf8');
    cfg = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`failed to read doccraft.json: ${(err as Error).message}`);
  }

  const declared = cfg['packages'];
  if (declared === undefined) return [];
  if (!Array.isArray(declared)) {
    throw new Error('doccraft.json: "packages" must be an array');
  }

  const loaded: LoadedPackage[] = [];
  const slugToPath = new Map<string, string>();
  for (let i = 0; i < declared.length; i++) {
    const entry = declared[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`doccraft.json: packages[${i}] must be an object with a "path" field`);
    }
    const rawPath = (entry as Record<string, unknown>)['path'];
    if (typeof rawPath !== 'string' || rawPath.length === 0) {
      throw new Error(`doccraft.json: packages[${i}].path must be a non-empty string`);
    }
    const normalised = rawPath.replace(/[\\/]+$/, '');
    const slug = path.posix.basename(normalised.split(path.sep).join(path.posix.sep));
    const existing = slugToPath.get(slug);
    if (existing !== undefined) {
      throw new Error(`duplicate package slug "${slug}" (paths ${existing} and ${rawPath})`);
    }
    slugToPath.set(slug, rawPath);
    loaded.push({ slug, path: rawPath });
  }
  return loaded;
}

/**
 * Matches any `<!-- doccraft:<directive> [attrs?] --> ... <!-- /doccraft:<directive> -->`
 * pair. Capture 1 is the directive name; capture 2 (optional) is the raw
 * attribute string for the opening marker.
 *
 * Dispatch in `bakeSkill` routes by directive name. v1 supports two:
 * `inject` (extension-fragment concatenation per ADR 013) and `packages`
 * (rendered package list per ADR 014). Unknown directives are a hard error.
 */
const DIRECTIVE_REGEX =
  /<!--\s*doccraft:([a-z][a-z0-9-]*)([^>]*?)\s*-->[\s\S]*?<!--\s*\/doccraft:\1\s*-->/g;

const KNOWN_DIRECTIVES = new Set(['inject', 'packages']);

function parseInjectAttrs(attrString: string, skillName: string): string {
  const match = attrString.match(/point=([a-z][a-z0-9.-]*)/);
  if (!match) {
    throw new Error(`inject marker missing point= attribute in template ${skillName}`);
  }
  return match[1];
}

/**
 * Renders the package-list block baked into skill bodies at
 * `<!-- doccraft:packages -->` markers when `packages[]` is non-empty.
 * Uses `{{DOCS_DIR}}` so the subsequent `applyDocsDir` pass substitutes
 * the project's configured docs directory.
 */
function renderPackagesDirective(packages: readonly LoadedPackage[]): string {
  if (packages.length === 0) return '';
  const lines: string[] = [];
  lines.push('## Known package roots');
  lines.push('');
  lines.push(
    'This project declares the following package roots. Each has its own'
  );
  lines.push(
    '`{{DOCS_DIR}}/` tree (stories, ADRs, queue, backlog) mirroring the'
  );
  lines.push('project-root structure.');
  lines.push('');
  for (const pkg of packages) {
    lines.push(`- \`${pkg.slug}\` — \`${pkg.path}/{{DOCS_DIR}}/\``);
  }
  lines.push('');
  lines.push(
    'When a `depends_on`, `adr_refs`, or queue reference uses the form'
  );
  lines.push(
    '`<slug>/STR-NNNN` or `<slug>/NNN-...md`, resolve the path against the'
  );
  lines.push(
    'matching root above. References without a slug prefix refer to the'
  );
  lines.push('project-root `{{DOCS_DIR}}/`.');
  return lines.join('\n');
}

/**
 * Walks `rawTemplate` for every `<!-- doccraft:<directive> -->` marker pair
 * and dispatches each one by directive name. Currently:
 *   - `inject`: concatenates extension fragments per `(skill, point)` pair
 *     in extension declaration order with a blank line between contributions.
 *   - `packages`: renders the package-list block when `packages[]` is
 *     non-empty.
 * Empty regions (no content to render) strip the marker pair along with
 * one trailing newline. Unknown directives are a hard error.
 */
export async function bakeSkill(
  rawTemplate: string,
  skillName: string,
  extensions: readonly LoadedExtension[] = [],
  packages: readonly LoadedPackage[] = []
): Promise<string> {
  const matches = [...rawTemplate.matchAll(DIRECTIVE_REGEX)];

  const seenInjectPoints = new Set<string>();
  let seenPackagesMarker = false;
  for (const match of matches) {
    const directive = match[1];
    if (!KNOWN_DIRECTIVES.has(directive)) {
      throw new Error(
        `unknown doccraft directive in template ${skillName}: ${directive}`
      );
    }
    if (directive === 'inject') {
      const point = parseInjectAttrs(match[2] ?? '', skillName);
      if (!(VALID_INJECTION_POINTS as readonly string[]).includes(point)) {
        throw new Error(`unknown injection point in template ${skillName}: ${point}`);
      }
      if (seenInjectPoints.has(point)) {
        throw new Error(`duplicate injection marker in template ${skillName}: ${point}`);
      }
      seenInjectPoints.add(point);
    } else if (directive === 'packages') {
      if (seenPackagesMarker) {
        throw new Error(`duplicate doccraft:packages marker in template ${skillName}`);
      }
      seenPackagesMarker = true;
    }
  }

  type Replacement = { start: number; end: number; replacement: string };
  const replacements: Replacement[] = [];

  for (const match of matches) {
    const directive = match[1];
    let replacement = '';
    if (directive === 'inject') {
      const point = parseInjectAttrs(match[2] ?? '', skillName) as InjectionPoint;
      const fragments: string[] = [];
      for (const ext of extensions) {
        for (const inject of ext.injects) {
          if (inject.skill !== skillName) continue;
          if (inject.point !== point) continue;
          const body = await readFile(inject.fragmentPath, 'utf8');
          fragments.push(body.replace(/\s+$/, ''));
        }
      }
      replacement = fragments.length === 0 ? '' : fragments.join('\n\n');
    } else if (directive === 'packages') {
      replacement = renderPackagesDirective(packages);
    }

    const start = match.index ?? 0;
    const end = start + match[0].length;
    replacements.push({ start, end, replacement });
  }

  if (replacements.length === 0) return rawTemplate;

  let result = '';
  let cursor = 0;
  for (const r of replacements) {
    result += rawTemplate.slice(cursor, r.start);
    if (r.replacement === '') {
      // Empty region: drop one trailing newline after the close marker so the
      // surrounding paragraphs stay tight.
      let endCursor = r.end;
      if (rawTemplate[endCursor] === '\n') endCursor++;
      cursor = endCursor;
    } else {
      result += r.replacement;
      cursor = r.end;
    }
  }
  result += rawTemplate.slice(cursor);
  return result;
}

/**
 * Walks each extension's `scaffold[]` source trees and copies files to
 * project-relative target paths. Existing target files are preserved (the
 * same never-overwrite semantics `scaffoldDocsIfMissing` uses). Returns the
 * paths (project-relative, POSIX style) that were newly created.
 */
export async function scaffoldExtensions(
  projectPath: string,
  extensions: readonly LoadedExtension[]
): Promise<string[]> {
  const created: string[] = [];
  for (const ext of extensions) {
    for (const entry of ext.scaffold) {
      await copyTree(entry.sourcePath, path.resolve(projectPath, entry.target), projectPath, created);
    }
  }
  return created;
}

async function copyTree(
  srcRoot: string,
  destRoot: string,
  projectPath: string,
  created: string[]
): Promise<void> {
  async function walk(srcDir: string, destDir: string): Promise<void> {
    const entries = await readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await walk(srcPath, destPath);
      } else if (entry.isFile()) {
        if (existsSync(destPath)) continue;
        await mkdir(path.dirname(destPath), { recursive: true });
        const body = await readFile(srcPath);
        await writeFile(destPath, body);
        const rel = path.relative(projectPath, destPath);
        created.push(rel.split(path.sep).join(path.posix.sep));
      }
    }
  }
  await walk(srcRoot, destRoot);
}
