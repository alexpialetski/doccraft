---
id: P2.2
title: Docs-maintenance skill family — reading and aging docs over time
status: todo
impact: M
urgency: later
tags:
  - area:skills
  - theme:docs
openspec: recommended
updated: 2026-04-18
roadmap_ref: P2.2
depends_on: []
---

## Problem / outcome

The shipped four skills all focus on *creating* and *updating* docs
artifacts. None covers *reading* or *maintaining* them over time:

- ADRs go stale as superseded decisions pile up; nothing surfaces
  superseded-by chains or flags contradicted status lines.
- Story cross-references (`adr_refs`) break when ADRs are renamed or
  superseded; nothing audits link integrity.
- `docs/README.md` and the `stories/` / `adr/` index READMEs drift as
  new artifacts land; nothing keeps the indexes fresh.
- No skill helps a user answer "what does the project already say about
  X?" from the accumulated docs — a real use case once the tree grows
  past ~20 artifacts.

Design a follow-on skill (or two) that closes these gaps. Working
name: `doccraft-docs-freshness` for the audit half, possibly
`doccraft-docs-search` for the query half. Scope TBD.

## Acceptance criteria

- [ ] Write a short design note (OpenSpec recommended) covering:
  - What specific staleness signals are worth catching (superseded-by
    cycles, dangling `adr_refs`, stale index rows, story `status: done`
    not reflected in backlog, …).
  - Whether the query half ("what do we already say about X?") fits in
    the same skill or wants its own, and if separate, how the two
    coordinate.
  - Whether this skill reads from `docs/config.yaml` (post-P0.1) for
    what's considered canonical vs. ignored.
- [ ] Port or author the skill(s) to `templates/skills/`; cover with
  tests matching the existing four-skill pattern.
- [ ] Extend `doccraft-session-wrap` to mention the docs-freshness
  skill when a thread touches stale-looking artifacts, if applicable.

## Notes

Not urgent: the gap only bites projects with accumulated docs history.
Re-surface once dogfooding generates enough ADRs and stories in
doccraft's own `docs/` to feel the staleness directly — that moment
will itself be the forcing function.

OpenSpec recommended because: new skill family, ambiguous scope, and
coordination with the config layer from P0.1.
