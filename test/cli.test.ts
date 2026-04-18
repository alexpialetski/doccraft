import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const binPath = path.join(repoRoot, 'bin', 'doccraft.js');

function readPkgVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  return pkg.version as string;
}

describe('doccraft CLI', () => {
  it('prints its version', () => {
    const output = execFileSync(process.execPath, [binPath, '--version'], {
      encoding: 'utf8',
    }).trim();

    expect(output).toBe(readPkgVersion());
  });

  it('prints help including init and update commands', () => {
    const output = execFileSync(process.execPath, [binPath, '--help'], {
      encoding: 'utf8',
    });

    expect(output).toContain('init');
    expect(output).toContain('update');
  });
});
