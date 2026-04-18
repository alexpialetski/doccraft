---
id: P1.1
title: Spike — does Cursor discover .claude/skills/ out of the box?
status: todo
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

- [ ] Empirical test: set up a scratch project with only
  `.claude/skills/doccraft-story/SKILL.md` present, no `.cursor/skills/`
  entries. Open in Cursor. Confirm whether the skill surfaces in Cursor's
  skill list and triggers on matching prompts.
- [ ] If Cursor discovers the skill: document the discovery mechanism
  (file-system scan, setting flag, Cursor version requirement) and decide
  whether to ship `--consolidate` as opt-in or make it default.
- [ ] If Cursor does not discover the skill: close the spike with a note
  in ADR 003 that the current dual-install approach stays permanent, and
  document the cross-tool sharing limitation.
- [ ] Either way: commit the finding as either an ADR update (if the
  current approach stays) or a new ADR + implementation story (if
  consolidation is viable).

## Notes

Non-goal: consolidation for Cursor-only teams. They don't have a
`.claude/` folder and shouldn't grow one just because we could share it.
The `--consolidate` flag (if introduced) is opt-in for dual-tool teams.
