import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const runDesignerSkillsInstallMock = vi.hoisted(() =>
  vi.fn<(projectPath: string) => Promise<void>>().mockResolvedValue(undefined)
);

vi.mock('../src/utils/designer-skills.js', () => ({
  DESIGNER_SKILLS_FALLBACK_COMMAND:
    'npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes',
  runDesignerSkills: vi.fn(),
  runDesignerSkillsInstall: runDesignerSkillsInstallMock,
}));

import { installDoccraftSkills } from '../src/commands/init.js';
import { DESIGNER_SKILLS_FALLBACK_COMMAND } from '../src/utils/designer-skills.js';

const tempDirs: string[] = [];

function makeTempProject(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'doccraft-design-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

beforeEach(() => {
  runDesignerSkillsInstallMock.mockReset();
  runDesignerSkillsInstallMock.mockResolvedValue(undefined);
});

describe('design feature (installDoccraftSkills)', () => {
  it('documents the exact manual npx command from the design spec', () => {
    expect(DESIGNER_SKILLS_FALLBACK_COMMAND).toBe(
      'npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes'
    );
  });

  it('persists design in doccraft.json when features include design', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude', ['design']);
    const raw = readFileSync(path.join(project, 'doccraft.json'), 'utf8');
    const cfg = JSON.parse(raw) as { features?: string[] };
    expect(cfg.features).toContain('design');
    expect(runDesignerSkillsInstallMock).toHaveBeenCalledWith(project);
  });

  it('re-invokes designer-skills on a second install when design is already in config', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude', ['design']);
    runDesignerSkillsInstallMock.mockClear();
    await installDoccraftSkills(project, 'claude');
    expect(runDesignerSkillsInstallMock).toHaveBeenCalledTimes(1);
    expect(runDesignerSkillsInstallMock).toHaveBeenCalledWith(project);
  });

  it('does not invoke designer-skills when design is omitted', async () => {
    const project = makeTempProject();
    await installDoccraftSkills(project, 'claude');
    expect(runDesignerSkillsInstallMock).not.toHaveBeenCalled();
  });

  it('surfaces the exact fallback command when designer-skills install fails', async () => {
    runDesignerSkillsInstallMock.mockRejectedValueOnce(
      new Error(
        `Designer skills install failed (exit code 1). Run manually from the project root:\n  ${DESIGNER_SKILLS_FALLBACK_COMMAND}`
      )
    );
    const project = makeTempProject();
    await expect(installDoccraftSkills(project, 'claude', ['design'])).rejects.toThrow(
      DESIGNER_SKILLS_FALLBACK_COMMAND
    );
  });
});
