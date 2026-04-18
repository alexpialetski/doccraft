import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

export interface RunOpenspecOptions {
  cwd?: string;
  stdio?: 'inherit' | 'pipe' | 'ignore';
  env?: NodeJS.ProcessEnv;
}

function resolveOpenspecBinary(): string {
  // The @fission-ai/openspec package does not expose its package.json via
  // `exports`, so we locate its install directory via its main entry point.
  const mainPath = require.resolve('@fission-ai/openspec');
  // Walk up until we find the package directory containing package.json.
  let dir = path.dirname(mainPath);
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as {
        name?: string;
        bin?: Record<string, string> | string;
      };
      if (pkg.name === '@fission-ai/openspec') {
        let binRelative: string | undefined;
        if (typeof pkg.bin === 'string') {
          binRelative = pkg.bin;
        } else if (pkg.bin && typeof pkg.bin === 'object') {
          binRelative = pkg.bin['openspec'] ?? Object.values(pkg.bin)[0];
        }
        if (!binRelative) {
          throw new Error('Could not locate openspec bin in @fission-ai/openspec package.json');
        }
        return path.join(dir, binRelative);
      }
    } catch {
      // keep walking up
    }
    dir = path.dirname(dir);
  }
  throw new Error('Could not locate @fission-ai/openspec package directory');
}

export async function runOpenspec(
  args: string[],
  options: RunOpenspecOptions = {}
): Promise<number> {
  const { cwd = process.cwd(), stdio = 'inherit', env = process.env } = options;
  const binPath = resolveOpenspecBinary();

  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [binPath, ...args], {
      cwd,
      stdio,
      env,
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 0));
  });
}
