import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { DOCCRAFT_CONFIG_SCHEMA } from '../utils/config-schema.js';
import { applyDocsDir, getAvailableSkills } from '../utils/skills.js';

const _require = createRequire(import.meta.url);

// Substituted at build time by build.js — never exposed as a literal in dist/.
const DOCCRAFT_VERSION = '{{DOCCRAFT_VERSION}}';

function getBundledOpenspecVersion(): string {
  try {
    const openspecMain = _require.resolve('@fission-ai/openspec');
    let dir = path.dirname(openspecMain);
    while (dir !== path.dirname(dir)) {
      const candidate = path.join(dir, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as {
          name?: string;
          version?: string;
        };
        if (pkg.name === '@fission-ai/openspec' && pkg.version) {
          return pkg.version;
        }
      } catch {
        // keep walking
      }
      dir = path.dirname(dir);
    }
  } catch {
    // ignore
  }
  return 'unknown';
}

interface SkillEntry {
  name: string;
  purpose: string;
}

const FRONTMATTER_MULTILINE_DESC_RE = /^description:\s*>\-?\n((?:  .+\n?)+)/m;
const FRONTMATTER_DESC_RE = /^description:\s*(.+)$/m;

async function buildSkillsList(): Promise<SkillEntry[]> {
  const skills = await getAvailableSkills();
  const entries: SkillEntry[] = [];

  for (const skill of skills) {
    const raw = await readFile(skill.skillFilePath, 'utf8');

    let purpose = '';

    // Try multiline folded scalar first (description: >-\n  line1\n  line2)
    const multiMatch = raw.match(FRONTMATTER_MULTILINE_DESC_RE);
    if (multiMatch) {
      purpose = multiMatch[1]
        .split('\n')
        .map((l) => l.replace(/^\s{2}/, ''))
        .filter(Boolean)
        .join(' ')
        .trim();
    } else {
      const singleMatch = raw.match(FRONTMATTER_DESC_RE);
      if (singleMatch) {
        purpose = singleMatch[1].trim();
      }
    }

    entries.push({ name: skill.name, purpose: applyDocsDir(purpose, 'docs') });
  }

  return entries;
}

export interface LlmManifest {
  version: string;
  bundledOpenspecVersion: string;
  schema: typeof DOCCRAFT_CONFIG_SCHEMA;
  skills: SkillEntry[];
  migrations: Array<{ from: string; to: string; summary: string; steps: string[] }>;
}

export async function runLlm(): Promise<void> {
  const skills = await buildSkillsList();

  const manifest: LlmManifest = {
    version: DOCCRAFT_VERSION,
    bundledOpenspecVersion: getBundledOpenspecVersion(),
    schema: DOCCRAFT_CONFIG_SCHEMA,
    skills,
    migrations: [],
  };

  process.stdout.write(JSON.stringify(manifest) + '\n');
}
