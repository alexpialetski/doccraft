---
id: P1.2
title: Ship --consolidate install flag for dual-tool projects
status: todo
impact: M
urgency: soon
tags:
  - area:cli
  - theme:install
openspec: not-needed
updated: 2026-04-18
roadmap_ref: P1.2
depends_on: []
adr_refs:
  - 005-consolidate-skills-for-dual-tool.md
  - 003-cursor-rule-stubs-only.md
  - 001-skill-install-pipeline.md
---

## Problem / outcome

Per ADR 005, dual-tool installs currently write byte-identical `SKILL.md`
into both `.claude/skills/` and `.cursor/skills/`. Cursor 2.4+
auto-discovers `.claude/skills/` without dedupe, so every skill is
loaded twice for dual-tool users — context-window waste with no
upside. Add an opt-in `--consolidate` flag so dual-tool users can
install skills only to `.claude/skills/` while still receiving the
Cursor rule stubs from ADR 003.

## Acceptance criteria

- [ ] `doccraft install --consolidate` writes `SKILL.md` only to
  `.claude/skills/<name>/SKILL.md`; no `.cursor/skills/` entries are
  produced.
- [ ] `.cursor/rules/*.mdc` stubs (per ADR 003) still emit when
  `--consolidate` is set, unaffected by the flag.
- [ ] Without the flag, install output is byte-for-byte identical to
  pre-change behaviour (no silent migration for existing users).
- [ ] `doccraft install --help` documents the flag, states it is
  opt-in, and notes the Cursor 2.4+ version requirement.
- [ ] `docs/README.md` mentions `--consolidate` in the install section
  with a one-line pointer to ADR 005 for rationale.
- [ ] Tests cover:
  - Snapshot: `--consolidate` run produces no `.cursor/skills/` tree.
  - Snapshot: `--consolidate` run still produces `.cursor/rules/*.mdc`.
  - Snapshot: default run is unchanged (dual-write preserved).
- [ ] ADR 005 is linked from the PR description.

## Notes

Non-goal: auto-detecting dual-tool presence and defaulting the flag on
— explicitly rejected in ADR 005 "Alternatives considered." Revisit
once `docs/config.yaml` gains an explicit tool-declaration key.

Non-goal: removing `.cursor/skills/` as a supported install target.
Cursor-only teams continue to receive skills at `.cursor/skills/`
(default behaviour, unchanged).

Flag name bikeshed: `--consolidate` reads clearly at the CLI and
matches the language used in ADR 005 and the spike story. Alternative
names considered (`--single-dir`, `--claude-only-skills`) are less
self-describing; keep `--consolidate`.
