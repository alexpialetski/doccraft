import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const binPath = path.join(repoRoot, 'bin', 'doccraft.js');
const distDir = path.join(repoRoot, 'dist');
const schemaPath = path.join(repoRoot, 'schema', 'doccraft.schema.json');
const templatesSkillsDir = path.join(repoRoot, 'templates', 'skills');

function readPkgVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

interface LlmManifest {
  version: string;
  bundledOpenspecVersion: string;
  schema: Record<string, unknown>;
  skills: Array<{ name: string; purpose: string }>;
  migrations: unknown[];
}

function getLlmManifest(): LlmManifest {
  const raw = execFileSync(process.execPath, [binPath, 'llm'], { encoding: 'utf8' });
  return JSON.parse(raw) as LlmManifest;
}

describe('doccraft CLI', () => {
  it('prints its version', () => {
    const output = execFileSync(process.execPath, [binPath, '--version'], {
      encoding: 'utf8',
    }).trim();

    expect(output).toBe(readPkgVersion());
  });

  it('prints help including init, update, and llm commands', () => {
    const output = execFileSync(process.execPath, [binPath, '--help'], {
      encoding: 'utf8',
    });

    expect(output).toContain('init');
    expect(output).toContain('update');
    expect(output).toContain('llm');
  });
});

describe('build output — version placeholder substitution', () => {
  it('no {{DOCCRAFT_VERSION}} literal exists in dist/commands/llm.js after build', () => {
    const llmJs = path.join(distDir, 'commands', 'llm.js');
    expect(existsSync(llmJs), 'dist/commands/llm.js should exist after build').toBe(true);
    const content = readFileSync(llmJs, 'utf8');
    expect(content).not.toContain('{{DOCCRAFT_VERSION}}');
  });

  it('version in dist/commands/llm.js matches package.json', () => {
    const llmJs = path.join(distDir, 'commands', 'llm.js');
    const content = readFileSync(llmJs, 'utf8');
    expect(content).toContain(readPkgVersion());
  });
});

describe('build output — schema/doccraft.schema.json', () => {
  it('schema file exists after build', () => {
    expect(existsSync(schemaPath)).toBe(true);
  });

  it('schema file is valid JSON', () => {
    const content = readFileSync(schemaPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('schema file matches what doccraft llm emits', () => {
    const fileSchema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    const manifest = getLlmManifest();
    expect(manifest.schema).toEqual(fileSchema);
  });
});

describe('doccraft llm', () => {
  it('outputs valid JSON', () => {
    const raw = execFileSync(process.execPath, [binPath, 'llm'], { encoding: 'utf8' });
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('version is not the placeholder literal', () => {
    expect(getLlmManifest().version).not.toBe('{{DOCCRAFT_VERSION}}');
  });

  it('version matches package.json', () => {
    expect(getLlmManifest().version).toBe(readPkgVersion());
  });

  it('bundledOpenspecVersion is a non-empty string', () => {
    expect(getLlmManifest().bundledOpenspecVersion).toBeTruthy();
  });

  it('migrations is an empty array', () => {
    expect(getLlmManifest().migrations).toEqual([]);
  });

  it('skills has one entry per templates/skills/ directory', () => {
    const skillDirs = readdirSync(templatesSkillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    const manifest = getLlmManifest();
    expect(manifest.skills.map((s) => s.name).sort()).toEqual(skillDirs);
  });

  it('each skill entry has a non-empty purpose', () => {
    for (const skill of getLlmManifest().skills) {
      expect(skill.purpose, `${skill.name} should have a purpose`).toBeTruthy();
    }
  });

  it('schema has a description field', () => {
    expect(getLlmManifest().schema.description).toBeTruthy();
  });
});
