## Why

Projects increasingly mix local LLMs (e.g. via llama-swap) and cloud models (e.g. via Cursor/Claude/Codex), and developers need a per-story signal that says **"this story is safe to do on the local coder"** vs **"this needs a cloud model"**. Doccraft has no way to express that today: stories carry `impact`, `urgency`, `openspec`, and (optionally) `designer`, but nothing about *which model is appropriate*.

Without this signal, the prevailing patterns are:

1. Hard-coding model recommendations into ad-hoc reference docs (project-side substitutes that drift from the upstream skill).
2. Trial-and-error per story, burning cloud tokens on work the local coder could handle.
3. Conventions kept "in the head" of the lead developer — fine for solo work, brittle when an agent or new contributor arrives.

This change introduces a project-owned **model registry** referenced from `doccraft.json`, and teaches `doccraft-story` to consult it when authoring or editing stories. The mechanism mirrors the existing `business`/`design` feature pattern: the field is **opt-in**, **absent by default**, and activates a conditional block in the rendered SKILL.md.

## What Changes

- Add an optional `story.modelHints` field to `doccraft.json`. The value is a **string path** (relative to project root) pointing at a project-owned markdown file that lists available models and per-task hints.
- When the field is present, `doccraft-story` SKILL.md (rendered at install/update time) gains a **Model hints integration block** that instructs the skill to:
  - Read the registry file before authoring or editing a story.
  - Suggest a `model_hint:` annotation in the story body (Notes section) consistent with the project's labels in the registry.
- When the field is absent, the rendered SKILL.md is unchanged from today (no extra prose, no extra fields).
- `doccraft init` and `doccraft update` gain an interactive **assisted setup** prompt: when the field is missing, ask the user whether they want to enable model hints; if yes, either point at an existing markdown file in the repo or invite the user to create one (the LLM running doccraft can scaffold the registry from the user's description).
- No changes to the upstream-shipped `templates/`, the npm tarball contents, or the schema beyond adding the optional field.

## Capabilities

### New Capabilities

- `story-model-hints`: optional `story.modelHints` config field plus an integration block in the `doccraft-story` SKILL.md that activates when the field is set.

### Modified Capabilities

- `json-config`: schema gains the optional `story.modelHints` string field (file path) with description and examples; absence remains valid and means the integration block is omitted.
- `doccraft-config-skill`: assisted setup gains a prompt offering to enable `story.modelHints`, accept a path to an existing file, or scaffold a new registry file from a short user description.
- `doccraft-update-skill`: when running `doccraft update` against a config that does **not** declare `story.modelHints`, surface a one-line migration hint pointing at the new feature.

## Impact

- `src/utils/config-schema.ts` — add `story.modelHints` (optional string, file path).
- `schema/doccraft.schema.json` — regenerated from the schema source.
- `src/utils/skills.ts` — add `MODEL_HINTS_BLOCK` renderer alongside the existing business-integration renderer; activation gated on `story.modelHints` being a non-empty string in the config.
- `templates/skills/doccraft-story/SKILL.md` — add `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder.
- `src/commands/init.ts` / `src/commands/update.ts` — assisted-setup prompts for model hints (init) and migration hint (update).
- Tests under `test/` — schema validation, block rendering on/off, migration hint emission.
- No changes to runtime dependencies, no subprocess calls, no network access required (unlike the `design` feature). The feature is **purely additive** and project-owned.
