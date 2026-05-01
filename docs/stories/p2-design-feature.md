---
id: P2.3
title: Design feature opt-in — subprocess install + designer story field
status: todo
impact: M
urgency: later
tags:
  - area:cli
  - area:skills
  - theme:extensibility
openspec: recommended
updated: 2026-05-01
roadmap_ref: P2.3
adr_refs:
  - 011-design-feature-opt-in.md
  - 010-business-module-opt-in.md
---

## Problem / outcome

Projects building UI surfaces have no structured design workflow integrated
with doccraft. Designer-skills (julianoczkowski/designer-skills) provides a
high-quality 8-skill set for design-to-build flows, but installing it
separately has no connection to doccraft's planning layer. Stories can't
signal that a design pass is required before implementation starts.

## Acceptance criteria

- [ ] `doccraft init --features design` spawns `npx --yes skills add
  julianoczkowski/designer-skills --agent claude-code --yes` as a subprocess
  and succeeds; skills appear at `.claude/skills/grill-me/`, `.claude/skills/design-brief/`,
  etc.
- [ ] `doccraft update` re-runs the subprocess when `"design"` is present in
  `doccraft.json` `features` array (same lifecycle as OpenSpec update).
- [ ] `"design"` is persisted to `doccraft.json` after `init --features design`,
  so subsequent `update` runs reinstall without a flag.
- [ ] `templates/skills/doccraft-story/SKILL.md` documents a `designer:` field
  (`not-needed` | `recommended` | `required`) with guidance text mirroring the
  `openspec:` field.
- [ ] `templates/skills/doccraft-queue-audit/SKILL.md` surfaces stories with
  `designer: required` as a note when no `.design/` directory exists in the
  project.
- [ ] Subprocess failure (e.g. network unavailable) emits a clear error message
  with the manual fallback command the user can run.
- [ ] `doccraft init` without `--features design` is unaffected; no design
  skills are installed and no `designer:` field is mentioned in skill output.

## Notes

OpenSpec recommended because: touches `src/utils/` (new module), `src/commands/init.ts`,
`src/commands/update.ts`, two skill templates (`doccraft-story`, `doccraft-queue-audit`),
and the JSON schema for `doccraft.json`.

Implementation sketch:
- `src/utils/designer-skills.ts` — `runDesignerSkills(projectPath)` following
  the same shape as `src/utils/openspec.ts` → `runOpenspec`. Spawns
  `npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes`
  with `cwd = projectPath`.
- `src/commands/init.ts` — call `runDesignerSkills` after `installDoccraftSkills`
  when `design` is in features.
- `src/commands/update.ts` — same gating, call after `installDoccraftSkills`.
- Story skill template — add optional `designer:` row to the frontmatter table
  and a `### designer guidance` section.
- Queue-audit skill template — add a heuristic check: if any story in scope has
  `designer: required` and `.design/` does not exist, emit an advisory.
- `schema/doccraft-schema.json` — add `"design"` to the `features` enum.

The skills CLI installs to `.claude/skills/<name>/SKILL.md` when passed
`--agent claude-code`, which is the canonical path (ADR 007). No path
post-processing required. Verified empirically.
