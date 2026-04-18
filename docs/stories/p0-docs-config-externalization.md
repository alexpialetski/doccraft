---
id: P0.1
title: Externalize project vocabulary to docs/config.yaml
status: todo
impact: H
urgency: now
tags:
  - area:cli
  - theme:docs
openspec: recommended
updated: 2026-04-18
roadmap_ref: P0.1
depends_on: []
adr_refs:
  - 002-defer-config-externalization.md
---

## Problem / outcome

Every shipped skill contains project-specific vocabulary (tag `area:` /
`slice:` / `theme:` values, story `id` conventions, queue-table layout,
dependency-graph rules) baked into the `SKILL.md` body. `doccraft update`
regenerates skill files from `templates/`, so any in-place vocabulary edits
a user made get overwritten silently.

The managed-by-doccraft header in shipped skills warns users about this
and forward-references `docs/config.yaml`. Land that file.

## Acceptance criteria

- [ ] `docs/config.yaml` exists as a first-class init artifact — created
  by `doccraft init` with opinionated defaults, never overwritten by
  `doccraft update`.
- [ ] The skills read at least the following keys from config at
  invocation time (with in-skill defaults as a last-resort fallback):
  - `story.areas`, `story.slices`, `story.themes` — tag vocabularies
  - `story.id.tiers` — P-tier prefixes if the project uses them
  - `adr.path` — defaults to `docs/adr/`
  - `queue.path` — defaults to `docs/queue.md`
  - `backlog.path` — defaults to `docs/backlog.md`
- [ ] `doccraft-queue-audit` stresses the config schema: id-regex, lane
  heuristic overrides, platform-spikes table location.
- [ ] Managed-by-doccraft header text updated: the forward-reference
  becomes "see `docs/config.yaml`" rather than "planned follow-up".
- [ ] Tests cover: default-fallback when config is missing, override
  when config is present, install-time scaffolding that only runs on
  first init (same semantics as the `docs/` scaffold).
- [ ] ADR 004 (or next number) captures the finalized config schema.

## Notes

OpenSpec recommended because: the config schema is the durable interface
between project and skill. Getting it wrong means a breaking change in a
future release. A brief spec document surfaces edge cases before code.

The `doccraft-queue-audit` skill's configurable surface is the largest
(see ADR 002); design the schema against that skill first, then verify
the smaller surfaces for story/adr/session-wrap fit cleanly.
