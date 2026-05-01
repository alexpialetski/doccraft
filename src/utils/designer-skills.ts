import { spawn } from 'node:child_process';

/** Exact command doccraft prints on failure and runs during init/update when `design` is enabled. */
export const DESIGNER_SKILLS_FALLBACK_COMMAND =
  'npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes';

export interface RunDesignerSkillsOptions {
  cwd?: string;
  stdio?: 'inherit' | 'pipe' | 'ignore';
  env?: NodeJS.ProcessEnv;
}

export async function runDesignerSkills(
  projectPath: string,
  options: RunDesignerSkillsOptions = {}
): Promise<number> {
  const { cwd = projectPath, stdio = 'inherit', env = process.env } = options;
  const args = [
    '--yes',
    'skills',
    'add',
    'julianoczkowski/designer-skills',
    '--agent',
    'claude-code',
    '--yes',
  ];

  return await new Promise<number>((resolve, reject) => {
    const child = spawn('npx', args, {
      cwd,
      stdio,
      env,
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 0));
  });
}

export async function runDesignerSkillsInstall(projectPath: string): Promise<void> {
  const code = await runDesignerSkills(projectPath);
  if (code !== 0) {
    throw new Error(
      `Designer skills install failed (exit code ${code}). Run manually from the project root:\n  ${DESIGNER_SKILLS_FALLBACK_COMMAND}`
    );
  }
}
