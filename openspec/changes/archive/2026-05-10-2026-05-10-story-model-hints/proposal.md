## Why

Stories carry `impact`, `urgency`, `openspec`, and (optionally) `designer`, but nothing about **which model is appropriate for the work**. Teams routinely have access to several models — different cloud tiers, locally-hosted models, or a mix — but doccraft has no way for them to record per-story preferences.

The result today is one of:

1. Hard-coding model conventions into ad-hoc reference docs that drift from the upstream skill.
2. Trial-and-error per story, burning the more expensive option on work a cheaper one could handle.
3. Conventions held in the lead developer's head — fragile when an agent or new contributor arrives.

This change introduces a project-owned **model registry** referenced from `doccraft.json`, and teaches `doccraft-story` to consult it when authoring or editing stories. Doccraft itself stays neutral: it does not know which models a project uses, whether they are local or cloud, or how they should be ranked. The registry file is the only source of truth for those decisions, and the registry's content + the story's context together drive the skill's recommendation.

## What Changes

- Add an optional `story.modelHints` field to `doccraft.json`. The value is a **string path** (relative to project root) pointing at a project-owned markdown file.
- When the field is present and non-empty, the rendered `doccraft-story` SKILL.md (produced at install/update time) gains an integration block that instructs the skill to read the registry file, combine its guidance with the story's context, and **append plain markdown at the end of story Notes**.
- When the field is absent or empty, the rendered SKILL.md is unchanged from today.
- **Default scaffold** ships the field populated and the file present:
  - `templates/doccraft.json` — `story.modelHints: "docs/reference/model-hints.md"`.
  - `templates/docs/reference/model-hints.md` — a neutral starter the user customises later.
- **`doccraft-config` skill guidance** — when the user runs the skill, it offers (in addition to its current Analyse/Edit modes) to walk through tailoring the `model-hints.md` file to the project's actual model ecosystem.
- **`doccraft update` migration manifest** — the `LlmManifest.migrations` array carries one entry for the version that introduces this field. Existing projects upgrading via `doccraft-update` see the migration summary and steps:
  1. Add `story.modelHints: "docs/reference/model-hints.md"` to `doccraft.json`.
  2. Create `docs/reference/model-hints.md` from the bundled neutral template (or point `modelHints` at any path the user prefers).
  3. Optional: invoke `doccraft-config` to tailor the registry to the project's models.
- No interactive prompts in `init` or `update`. Existing projects discover the feature via the manifest; new projects get it pre-wired.

## Capabilities

### New Capabilities

- `story-model-hints`: optional `story.modelHints` config field plus an integration block in the `doccraft-story` SKILL.md that activates when the field is set; default scaffold that ships the field populated.

### Modified Capabilities

- `json-config`: schema gains the optional `story.modelHints` string field with description and examples; absence remains valid and means the integration block is omitted. The `templates/doccraft.json` shipped to new projects sets `story.modelHints: "docs/reference/model-hints.md"` by default.
- `doccraft-config-skill`: SKILL.md guidance gains a section describing the model-hints registry and offering to tailor it to the project's ecosystem (no schema/Edit-mode change; this is body guidance only).
- `llm-manifest`: the manifest emitted by `doccraft llm` includes a migration entry for the version introducing `story.modelHints`, declaring the steps required for existing projects (add field; create registry from template; optionally tailor).

## Impact

- `src/utils/config-schema.ts` — add optional `story.modelHints` (string).
- `schema/doccraft.schema.json` — regenerated from the schema source.
- `src/utils/skills.ts` — add `MODEL_HINTS_BLOCK` renderer alongside the existing business-integration renderer; activation gated on `story.modelHints` being a non-empty string.
- `templates/skills/doccraft-story/SKILL.md` — add `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder.
- `templates/skills/doccraft-config/SKILL.md` — add a section about the model-hints registry and how to tailor it.
- `templates/docs/reference/model-hints.md` — new neutral starter template.
- `templates/doccraft.json` — set `story.modelHints` by default.
- `src/commands/llm.ts` — populate the `migrations` array with the model-hints entry.
- Tests under `test/` — schema validation, block rendering on/off, manifest migration entry, scaffold-includes-template path.
- No new runtime dependencies, no subprocess calls, no network access required, no interactive prompts. Purely additive for existing projects (gated on opt-in via the migration), zero-effort for new projects (shipped pre-wired).
