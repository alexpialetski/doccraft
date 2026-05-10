# ADR 012 — Story model hints via optional `story.modelHints` path

**Status:** Accepted  
**Date:** 2026-05-10

---

## Context

Teams often have several models available (different tiers, hosts, or roles) but doccraft stories had no structured place to record which model fits which work. Conventions lived in ad-hoc docs or tacit knowledge, drifting from the generated skills.

## Decision

1. **Optional string field** — `story.modelHints` in `doccraft.json` holds a path relative to the project root to a **project-owned** markdown registry. No inline registry, no discriminated union, no schema validation of the file contents.

2. **Presence-gated skill block** — At install/update time, when the field is a non-empty string, the rendered `doccraft-story` SKILL.md includes a **Model hints** section that instructs the agent to read the registry and **append plain markdown at the end of story Notes**. When the field is absent or empty, the placeholder is stripped and output matches the no-field path (no leftover markers).

3. **Default scaffold** — New projects get `story.modelHints` set to `docs/reference/model-hints.md` and the neutral starter file under `templates/docs/` is copied alongside other scaffolded docs. Existing files are never overwritten.

4. **Discovery for upgrades** — `doccraft llm` emits a semver-scoped migration entry (`from` / `to`) describing how to add the field and create the registry file when missing. No interactive prompts in `init` or `update`; the doccraft-update skill remains the approval gate when entries match the local→latest range.

5. **doccraft-config guidance only** — The config skill documents the registry, recommended sections, and a tailoring flow with a starter-matching heuristic. Analyse and Edit modes are unchanged.

## Consequences

- Positive: simple schema; registry stays human-editable markdown; migration manifest reuses ADR 009 machinery.
- Negative: doccraft cannot enforce label quality or detect stale registries; accepted as project-owned trade-off.

## Alternatives considered

- **`features` enum entry** — Rejected; features imply extra shipped skills or subprocesses.
- **Dedicated frontmatter field for model choice with a fixed enum** — Rejected; keeps vocabulary project-owned in the registry and Notes prose.
- **Interactive init/update prompts** — Rejected; scaffold + manifest suffice.
