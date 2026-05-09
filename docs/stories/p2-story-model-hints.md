---
id: P2.4
title: Per-story model hints registry and skill integration
status: done
impact: M
urgency: later
tags:
  - area:schemas
  - area:skills
  - theme:docs
openspec: not-needed
updated: 2026-05-10
roadmap_ref: P2.4
depends_on: []
adr_refs:
  - 012-story-model-hints-registry.md
openspec_change: openspec/changes/2026-05-10-story-model-hints
---

## Problem / outcome

Projects with multiple models had no first-class way to steer `doccraft-story` toward the right model for a given story. Doccraft needed an optional, project-owned registry path and install-time integration without breaking projects that opt out.

## Acceptance criteria

- [x] `story.modelHints` is optional in the JSON Schema with description and examples.
- [x] Default `templates/doccraft.json` sets the field; neutral `templates/docs/reference/model-hints.md` scaffolds on init when missing.
- [x] Rendered `doccraft-story` includes the model-hints block only when the field is non-empty; other skills unchanged.
- [x] `doccraft llm` declares a semver-scoped migration entry for adopting the field on upgrade.
- [x] `doccraft-config` SKILL body documents the registry and tailoring constraints.

## Notes

Implemented per OpenSpec change `2026-05-10-story-model-hints`. `doccraft-queue-audit` unchanged in this iteration.
