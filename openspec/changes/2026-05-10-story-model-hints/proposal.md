## Why

Stories carry `impact`, `urgency`, `openspec`, and (optionally) `designer`, but nothing about **which model is appropriate for the work**. Teams routinely have access to several models — different cloud tiers (e.g. a daily-driver, a stronger reasoner, a spec-prose model), and sometimes one or more locally-hosted models — but doccraft has no way for them to record per-story preferences.

The result today is one of:

1. Hard-coding model conventions into ad-hoc reference docs that drift from the upstream skill.
2. Trial-and-error per story, burning the more expensive option on work a cheaper one could handle.
3. Conventions held in the lead developer's head — fragile when an agent or new contributor arrives.

This change introduces a project-owned **model registry** referenced from `doccraft.json`, and teaches `doccraft-story` to consult it when authoring or editing stories. Doccraft itself stays neutral: it does not know which models a project uses, whether they are local or cloud, or how they should be ranked. The registry file is the only source of truth for those decisions, and the registry's content + the story's context together drive the skill's recommendation.

## What Changes

- Add an optional `story.modelHints` field to `doccraft.json`. The value is a **string path** (relative to project root) pointing at a project-owned markdown file.
- When the field is present, the rendered `doccraft-story` SKILL.md (produced at install/update time) gains an integration block that instructs the skill to:
  - Read the registry file before authoring or editing a story.
  - Combine the registry's guidance with the story's context (tags, impact, urgency, body) to suggest a `model_hint:` annotation in the story's Notes section, using only the labels the registry defines.
- When the field is absent, the rendered SKILL.md is unchanged from today.
- `doccraft init` and `doccraft update` add user-facing hooks for discovery: `init` offers an interactive prompt (skip / point at an existing file / scaffold a template); `update` emits a one-time migration hint when the field is unset.
- The shipped scaffolding template is **deliberately neutral**: it explains how to describe whichever models the project has and however the project wants to label them. Doccraft does not assume local-vs-cloud, fast-vs-slow, or any other axis.

## Capabilities

### New Capabilities

- `story-model-hints`: optional `story.modelHints` config field plus an integration block in the `doccraft-story` SKILL.md that activates when the field is set.

### Modified Capabilities

- `json-config`: schema gains the optional `story.modelHints` string field with description and examples; absence remains valid and means the integration block is omitted.
- `doccraft-config-skill`: assisted setup gains a prompt offering to enable `story.modelHints`, accept a path to an existing file, or scaffold a new registry file from a built-in template.
- `doccraft-update-skill`: when running `doccraft update` against a config that does **not** declare `story.modelHints`, surface a one-line migration hint pointing at the new feature once.

## Impact

- `src/utils/config-schema.ts` — add `story.modelHints` (optional string, file path).
- `schema/doccraft.schema.json` — regenerated from the schema source.
- `src/utils/skills.ts` — add `MODEL_HINTS_BLOCK` renderer alongside the existing business-integration renderer; activation gated on `story.modelHints` being a non-empty string.
- `templates/skills/doccraft-story/SKILL.md` — add `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder.
- `templates/docs/reference/model-hints.md` — new neutral starter template.
- `src/commands/init.ts` / `src/commands/update.ts` — assisted-setup prompt (init) and migration hint (update).
- Tests under `test/` — schema validation, block rendering on/off, migration hint emission.
- No new runtime dependencies, no subprocess calls, no network access required. The feature is purely additive and project-owned.
