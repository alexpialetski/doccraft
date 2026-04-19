#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const runTsc = (args = []) => {
  const tscPath = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tscPath, ...args], { stdio: 'inherit' });
};

const pkg = require('./package.json');
const version = pkg.version;

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

// Emit schema/doccraft.schema.json from the compiled config-schema module.
console.log('Emitting schema/doccraft.schema.json...');
const { DOCCRAFT_CONFIG_SCHEMA } = await import('./dist/utils/config-schema.js');
mkdirSync('schema', { recursive: true });
writeFileSync('schema/doccraft.schema.json', JSON.stringify(DOCCRAFT_CONFIG_SCHEMA, null, 2) + '\n', 'utf8');
console.log('Schema OK.');

// Substitute {{DOCCRAFT_VERSION}} placeholder in dist/commands/llm.js.
const llmPath = 'dist/commands/llm.js';
if (existsSync(llmPath)) {
  const src = readFileSync(llmPath, 'utf8');
  if (src.includes('{{DOCCRAFT_VERSION}}')) {
    writeFileSync(llmPath, src.replaceAll('{{DOCCRAFT_VERSION}}', version), 'utf8');
    console.log(`Version ${version} substituted in ${llmPath}.`);
  }
}
