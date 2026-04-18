#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const runTsc = (args = []) => {
  const tscPath = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tscPath, ...args], { stdio: 'inherit' });
};

console.log('Building doccraft...');

if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}

try {
  runTsc();
  console.log('Build OK.');
} catch {
  console.error('Build failed.');
  process.exit(1);
}
