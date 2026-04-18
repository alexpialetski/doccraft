---
id: P1.2
title: Ship --consolidate install flag for dual-tool projects
status: done
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

- [x] `doccraft init --consolidate` / `doccraft update --consolidate`
  writes `SKILL.md` only to `.claude/skills/<name>/SKILL.md`; no
  `.cursor/skills/` entries are produced. (AC said `doccraft install`;
  doccraft has `init` and `update` subcommands, both received the flag.)
- [x] `.cursor/rules/*.mdc` stubs (per ADR 003) still emit when
  `--consolidate` is set, unaffected by the flag.
- [x] Without the flag, install output is byte-for-byte identical to
  pre-change behaviour (no silent migration for existing users).
- [x] `doccraft init --help` and `doccraft update --help` document the
  flag and link to ADR 005. Update's help also documents the
  explicit-`--tools` requirement.
- [x] Top-level `README.md` mentions `--consolidate` in both the
  `init` and `update` flag sections with a pointer to ADR 005 for
  rationale.
- [x] Tests cover:
  - `--consolidate` run produces no `.cursor/skills/` tree.
  - `--consolidate` run still produces `.cursor/rules/*.mdc`
    (exercised via the existing `installRules` scoping test, which
    is unaffected by `filterSkillTargets`).
  - Default run is unchanged (dual-write preserved — existing
    assertion against byte-identical content across both tools).
- [x] ADR 005 is linked from the PR description (commit body of the
  feat commit that implemented this story).

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

## Implementation notes (post-ship)

Two subtle behaviours landed beyond the AC and worth calling out:

- **Stale-cursor advisory** — when `--consolidate` runs on a project
  that was previously dual-installed, `.cursor/skills/doccraft-*`
  directories remain on disk and Cursor keeps loading them. The install
  prints a yellow advisory naming the stale dirs with an exact
  copy-pasteable `rm -r` command. Non-destructive: user decides when to
  clean up. ADR 005 didn't explicitly call out this migration step;
  adding the advisory here rather than automated cleanup was a deliberate
  "opt-in, non-surprising" call consistent with the ADR's rationale for
  the flag being opt-in.

- **Update requires explicit `--tools`** — `doccraft update` normally
  detects installed tools from disk. Under `--consolidate` that
  detection heuristic isn't strong enough signal for an opinionated
  layout change (an existing dual install detects as both, but
  consolidation means actively removing one target). Update throws
  early with a clear message pointing at `--tools claude,cursor`.
