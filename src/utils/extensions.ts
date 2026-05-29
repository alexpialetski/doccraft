import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * The fixed v1 set of injection points. Extensions targeting any other point
 * are rejected at load time.
 *
 * Per ADR 013: adding a value is a non-breaking change; removing a value is
 * breaking. The four core skills own these points — `doccraft-config` and
 * `doccraft-update` are infrastructure skills and have no points in v1.
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
] as const;

export type InjectionPoint = (typeof VALID_INJECTION_POINTS)[number];

/** Skill names that may host injections. */
export const INJECTABLE_SKILLS = [
  'doccraft-story',
  'doccraft-adr',
  'doccraft-queue-audit',
  'doccraft-session-wrap',
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
 * Matches an inject marker pair, including the marker lines themselves and
 * the leading newline immediately before the close marker so empty regions
 * collapse cleanly. Tolerates whitespace inside the marker tags.
 *
 * Capture group 1 is the point name.
 */
const INJECT_MARKER_REGEX =
  /<!--\s*doccraft:inject\s+point=([a-z][a-z0-9.-]*)\s*-->[\s\S]*?<!--\s*\/doccraft:inject\s*-->/g;

/**
 * Detects extra open markers without a matching close — used to surface
 * malformed templates rather than silently leaving the marker in place.
 */
const OPEN_MARKER_REGEX = /<!--\s*doccraft:inject\s+point=([a-z][a-z0-9.-]*)\s*-->/g;

/**
 * Concatenates fragment bodies for each `<!-- doccraft:inject point=... -->`
 * marker pair in `rawTemplate`. Fragments are joined in extension declaration
 * order with a single blank line between contributions. Empty regions
 * (no matching extensions) strip the marker pair along with one trailing
 * newline.
 */
export async function bakeSkill(
  rawTemplate: string,
  skillName: string,
  extensions: readonly LoadedExtension[]
): Promise<string> {
  const seenPoints = new Set<string>();
  const allOpens = [...rawTemplate.matchAll(OPEN_MARKER_REGEX)];
  for (const m of allOpens) {
    const point = m[1];
    if (!(VALID_INJECTION_POINTS as readonly string[]).includes(point)) {
      throw new Error(`unknown injection point in template ${skillName}: ${point}`);
    }
    if (seenPoints.has(point)) {
      throw new Error(`duplicate injection marker in template ${skillName}: ${point}`);
    }
    seenPoints.add(point);
  }

  const matches = [...rawTemplate.matchAll(INJECT_MARKER_REGEX)];
  if (matches.length !== allOpens.length) {
    const closed = new Set(matches.map((m) => m[1]));
    const unmatched = allOpens.find((m) => !closed.has(m[1]));
    if (unmatched) {
      throw new Error(
        `unterminated injection marker in template ${skillName}: ${unmatched[1]} has no matching close`
      );
    }
  }

  type Replacement = { start: number; end: number; replacement: string };
  const replacements: Replacement[] = [];

  for (const match of matches) {
    const point = match[1] as InjectionPoint;
    const fragments: string[] = [];
    for (const ext of extensions) {
      for (const inject of ext.injects) {
        if (inject.skill !== skillName) continue;
        if (inject.point !== point) continue;
        const body = await readFile(inject.fragmentPath, 'utf8');
        fragments.push(body.replace(/\s+$/, ''));
      }
    }

    const start = match.index ?? 0;
    const end = start + match[0].length;
    let replacement: string;
    if (fragments.length === 0) {
      replacement = '';
    } else {
      replacement = fragments.join('\n\n');
    }
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
