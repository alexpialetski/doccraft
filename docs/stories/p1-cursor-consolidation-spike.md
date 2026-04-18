---
id: P1.1
title: Spike — does Cursor discover .claude/skills/ out of the box?
status: done
impact: M
urgency: soon
tags:
  - area:cli
  - theme:testing
openspec: not-needed
updated: 2026-04-18
roadmap_ref: P1.1
depends_on: []
adr_refs:
  - 003-cursor-rule-stubs-only.md
  - 005-consolidate-skills-for-dual-tool.md
---

## Problem / outcome

Current install writes byte-identical SKILL.md into both `.claude/skills/`
and `.cursor/skills/`. If Cursor already discovers Agent Skills from
`.claude/skills/` out of the box (claimed but unverified), the
dual-install is redundant for users running both tools. A `--consolidate`
flag could install once to `.claude/skills/` and add only Cursor rule
stubs, halving the skill-file footprint and eliminating the byte-duplicate
maintenance concern.

## Acceptance criteria

- [x] Empirical test: set up a scratch project with only
  `.claude/skills/doccraft-story/SKILL.md` present, no `.cursor/skills/`
  entries. Open in Cursor. Confirm whether the skill surfaces in Cursor's
  skill list and triggers on matching prompts.
- [x] If Cursor discovers the skill: document the discovery mechanism
  (file-system scan, setting flag, Cursor version requirement) and decide
  whether to ship `--consolidate` as opt-in or make it default.
- [x] Either way: commit the finding as either an ADR update (if the
  current approach stays) or a new ADR + implementation story (if
  consolidation is viable).

## Outcome

Cursor **does** auto-discover `.claude/skills/`. Confirmed empirically
in a scratch project containing only `.claude/skills/<name>/SKILL.md`;
skill surfaced in Cursor and triggered on matching prompts. Cursor's
2.4 changelog documents the behaviour (scans `.claude/skills/`,
`.codex/skills/`, and `.cursor/skills/`). Version floor: **Cursor
2.4+**.

Additional finding from the Cursor community forum: Cursor does **not**
dedupe across discovery directories — dual-install projects get every
skill loaded twice, wasting context. That strengthens the case for
consolidation beyond footprint.

**Decision:** ship `--consolidate` as **opt-in** (not default).
Rationale and alternatives in
[ADR 005](../adr/005-consolidate-skills-for-dual-tool.md).
Implementation tracked as P1.2 —
[Ship --consolidate install flag](p1-consolidate-install-flag.md).

## Notes

Non-goal: consolidation for Cursor-only teams. They don't have a
`.claude/` folder and shouldn't grow one just because we could share it.
The `--consolidate` flag is opt-in for dual-tool teams.
