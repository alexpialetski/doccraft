---
id: P1.4
title: Default skill install to .claude/skills/; remove --consolidate
status: done
impact: H
urgency: now
tags:
  - area:cli
  - theme:docs
openspec: not-needed
updated: 2026-04-18
roadmap_ref: P1.4
depends_on: []
adr_refs:
  - 007-default-skill-install-to-claude-skills.md
  - 005-consolidate-skills-for-dual-tool.md
---

## Problem / outcome

P1.2 shipped `--consolidate` as an opt-in flag. Dogfood use surfaced
the obvious follow-up: the optimised layout (skills to
`.claude/skills/` only, Cursor 2.4+ auto-discovery, rule stubs
unchanged) should be the default behaviour, not a flag users have to
opt into after reading ADR 005.

ADR 005's semantic objection ("Cursor-only teams don't have a
`.claude/` folder and shouldn't grow one") weakened as
`.claude/skills/` became the de facto canonical Agent Skills location
across the ecosystem. Flip the default; remove the flag outright (no
shipped customers, so no deprecation layer needed).

## Acceptance criteria

- [x] `doccraft init` writes skills only to `.claude/skills/`
  regardless of `--tools` selection.
- [x] `.cursor/skills/` is never written by doccraft — no dual-write
  branch in the install pipeline.
- [x] Rule stubs (`.cursor/rules/*.mdc`) continue to install when
  Cursor is in the tool selection; unaffected by this change.
- [x] `--consolidate` CLI flag is **removed** (not deprecated) from
  both `init` and `update`. `InitOptions` and `UpdateOptions` drop
  the `consolidate?` field; `validateConsolidate` and
  `filterSkillTargets` removed as unused.
- [x] When Cursor is in the user's selection, `doccraft init` prints
  a one-line reminder that auto-discovery requires Cursor 2.4+.
- [x] Stale-cursor advisory (`findStaleCursorSkills`) runs
  unconditionally after install, not gated on a flag.
- [x] README rewrites the bundled-skills callout to describe the
  single install target and call out the Cursor 2.4+ requirement.
- [x] ADR 007 captures the full decision (including the rejection of
  a deprecation layer).
- [x] ADR 005's Status line changes to `Superseded by ADR 007` with a
  preamble explaining that the opt-in rationale was accurate at the
  time. ADR 005 is preserved as historical record, not rewritten.
- [x] Tests updated: the `validateConsolidate` and
  `filterSkillTargets` suites removed; a new
  `installDoccraftSkills (ADR 007 default layout)` suite covers the
  three `--tools` permutations (claude, cursor, claude,cursor) and
  asserts only `.claude/skills/` is populated in each.

## Notes

Breaking change, marked with `!` in the commit subject
(`feat(cli)!: install skills only to .claude/skills/; remove
--consolidate`). At 0.x the `!` does not force a major bump under
semantic-release's conventional-commits preset, so this likely ships
as 0.7. A later 1.0 milestone can batch further design stabilisation.

OpenSpec unaffected: doccraft still forwards `--tools` verbatim. If a
user picks Cursor, OpenSpec still writes to `.cursor/skills/openspec-
*` (that's OpenSpec's call). The mixed state is ugly in theory but
honest: doccraft owns only its own install layout, not OpenSpec's.

Non-goal: renaming `.claude/skills/` to something neutral like
`.agent-skills/`. Discussed in ADR 007; the ecosystem has already
settled on `.claude/skills/` as the canonical location. Revisit only
if a neutral name becomes widely supported by tool vendors.
