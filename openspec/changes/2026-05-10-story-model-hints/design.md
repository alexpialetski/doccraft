## Context

Doccraft already has a precedent for **conditional integration blocks** in skill templates: the `business` feature (see `src/utils/skills.ts:269-316`) renders `{{BUSINESS_INTEGRATION_BLOCK}}` differently based on whether `"business"` appears in `doccraft.json.features`. The same machinery is the right shape for model hints — the only difference is that activation is gated on **field presence**, not on the `features` enum.

Doccraft also has a precedent for delivering schema/template changes to existing projects: the `LlmManifest.migrations` array (`src/commands/llm.ts`). The `doccraft-update` skill reads this array and surfaces the entries to the user during update, gating on approval. That is the right discovery channel for an existing project — no init/update interactive prompts needed.

This change spans:

1. **Schema** — one optional string field under `story`.
2. **Renderer** — a new block-substitution branch in `src/utils/skills.ts` keyed on the field's presence.
3. **Default scaffold** — `templates/doccraft.json` and the new `templates/docs/reference/model-hints.md` so new projects get the feature pre-wired.
4. **Migration manifest** — `src/commands/llm.ts` declares one migration entry for existing projects upgrading past the introducing version.
5. **`doccraft-config` SKILL.md guidance** — a new body section explaining the model-hints registry and how to tailor it (no Edit/Analyse mode change).

No interactive prompts. No new runtime calls. The user-facing surface is only the rendered SKILL.md bodies and the migration manifest — both are pre-existing channels.

## Goals / Non-Goals

**Goals:**

- Add `story.modelHints` as an optional `string` (file path) in `doccraft.json`. **No** inline registry, **no** discriminated union — keep the schema simple.
- When set, render an integration block in `doccraft-story` SKILL.md that tells the skill to read the registry and combine its guidance with story context.
- When unset, render the SKILL.md exactly as today (no whitespace artefacts, no leftover placeholder).
- Ship a neutral starter template at `templates/docs/reference/model-hints.md`. The default scaffold (`templates/doccraft.json`) sets `story.modelHints` to point at this file so new projects get the feature pre-wired with a customisable starter.
- Deliver the same artefacts to existing projects via the `LlmManifest.migrations` mechanism so `doccraft update` can apply the change.
- Update `doccraft-config` SKILL.md body to document the registry and the recommended tailoring flow.

**Non-Goals:**

- Inline registry inside `doccraft.json` (rejected — complicates schema; markdown is the right format for human-readable per-task guidance).
- Validating the registry file's content or shape (rejected — it is project-owned).
- A `model_hint:` frontmatter field with a fixed enum (rejected — labels are project-defined).
- A `features` enum entry (rejected — `features` is for package-level opt-ins that install skills or run subprocesses; this adds neither).
- Interactive prompts in `init` or `update` (rejected — discovery is via the migration manifest for existing projects and the default scaffold for new ones; both are pre-existing channels).
- Doccraft-side knowledge of model topology (local/cloud/mixed/etc.). The block stays runtime-agnostic; the registry decides which axes matter.

## Decisions

### Field shape: presence-gated optional string, no inline form

`story.modelHints` is an optional string; its value is a path relative to the project root pointing at a markdown file. The schema does **not** validate that the file exists.

```jsonc
{
  "story": {
    "modelHints": "docs/reference/model-hints.md"
  }
}
```

**Alternatives considered:**

- **Discriminated union** `{ $ref?: string, registry?: object }`: rejected per user direction. Adds schema complexity for marginal gain.
- **Object wrapper** `{ "modelHints": { "file": "..." } }`: rejected — single-purpose field. Can be promoted to an object via a non-breaking minor later (treat string-as-shorthand for `{ "file": "..." }`).

### Activation gating: presence, not `features` enum

`{{MODEL_HINTS_INTEGRATION_BLOCK}}` is replaced by the rendered block iff `config.story?.modelHints` is a non-empty string at install/update time. Otherwise the placeholder is replaced by the empty string (mirroring `applyBusinessBlock`'s feature-disabled path).

**Alternatives considered:**

- **`features: ["model-hints"]` opt-in**: rejected — `features` is for opt-ins that install skills or run subprocesses; reusing it would be misleading.
- **Always render the block**: rejected — adds noise to projects that have not opted in.

### Discovery: scaffold by default, manifest migration for existing projects

**For new projects**, `templates/doccraft.json` sets `story.modelHints: "docs/reference/model-hints.md"`, and `init` writes `templates/docs/reference/model-hints.md` to that path. The default starter is neutral: it explains how to describe whichever models the project has and however the project wants to label them.

**For existing projects**, the `LlmManifest.migrations` array (returned by `doccraft llm`) carries one entry pointing at the version that introduces this field. `doccraft-update` filters this array on local→latest version range, summarises the entry, and gates on approval before running the update. The migration entry's `steps[]`:

1. Add `story.modelHints: "docs/reference/model-hints.md"` to `doccraft.json` (or any path the user prefers).
2. Create `docs/reference/model-hints.md` from the neutral template at the same path. (`doccraft update` writes the template if absent; if a file already exists at the chosen path, it is left untouched.)
3. Optional: invoke `doccraft-config` to walk through tailoring the registry to the project's actual model ecosystem.

**Alternatives considered:**

- **Interactive prompt in `init`/`update`**: rejected per user direction. The interactive surface in `init`/`update` is overkill: a sensible default scaffold + a migration manifest already cover both cases.
- **Force-write the registry file even when one exists**: rejected — that would clobber project-owned content. The migration step is "create if missing", never "overwrite".
- **Silently introduce on update without a manifest entry**: rejected — the user should see the change. The manifest is the established channel for that.

### Skill block content (canonical)

Rendered into `doccraft-story` SKILL.md only. Runtime-agnostic; the registry decides which axes matter:

```markdown
## Model hints

This project's `doccraft.json` declares `story.modelHints: "<PATH>"`. Before authoring or editing a story:

1. **Read** the registry at `<PATH>`. Treat it as the project's source of truth for which models are appropriate for which kind of work, and how to combine them when a story benefits from more than one.
2. **Combine the registry's guidance with the story's context** — tags, impact, urgency, body — to choose a recommendation. The registry defines which axes matter (e.g. cost, speed, reasoning depth, code-grounding, runtime); doccraft does not.
3. **Suggest a `model_hint:` annotation** in the story's Notes section using *only* the labels the registry defines. Do not invent new labels — if nothing fits, propose extending the registry instead.
4. When updating an existing story, leave the existing `model_hint:` line in place unless it contradicts the story body or the registry's guidance has changed.

The label vocabulary, the model list, and the decision rules are **project-defined**, not doccraft-defined. The registry is the contract.
```

`doccraft-queue-audit` is **not** changed in this iteration — model hints do not affect dependency graphs or queue ordering.

### `doccraft-config` SKILL.md body addition

A new section in `templates/skills/doccraft-config/SKILL.md` (between "Modes" and "Constraints") titled **"Model hints registry"**:

- Explains that `story.modelHints` points at a project-owned markdown file describing which models are appropriate for which work.
- Documents the recommended sections of that file (Available Models, Label Vocabulary, Decision Rules, optional Per-story Mapping). The skill *describes* the conventions but does not enforce them — the file is project-owned.
- Provides a recommended tailoring flow: when the user invokes `doccraft-config`, the skill should offer to walk them through replacing the neutral starter content with the project's actual models and labels, *if and only if* `story.modelHints` is set and the file currently matches the bundled starter (heuristic: file size and header match).
- Explicit constraint: the skill MUST NOT validate the registry's content beyond confirming the file exists at the configured path. If the file is custom, leave it alone.

### Registry file shape (advisory, not mandated)

The change ships a **neutral template** at `templates/docs/reference/model-hints.md`. The schema does not enforce its structure. Suggested sections:

- **Available models** — placeholder rows the user fills in with whichever models they have access to.
- **Label vocabulary** — placeholder labels with one-line guidance per label, framed as project-defined examples.
- **Decision rules** (optional) — how labels combine for a given story. May describe a single model, an ordered fallback chain, or multiple models in collaboration.
- **Per-story mapping** (optional) — empty table for an authoritative live list.

The template explicitly does not assume local-vs-cloud, free-vs-paid, fast-vs-slow, single-model-vs-combination, or any other axis. It is the *contract about how to describe a project's setup*, not a reflection of any one project's setup.

## Risks / Trade-offs

- **Registry file drift** — the file is project-owned, so it can become stale. Mitigation: the rendered block tells the agent to read it on every story authoring/edit; staleness becomes visible at story-author time.
- **Label vocabulary becomes a snowflake per project** — accepted; same trade-off as `area:`/`slice:`/`theme:` tags being project-defined.
- **No schema validation on registry content** — accepted; doccraft does not own the labels.
- **Default scaffold ships an extra file** (`docs/reference/model-hints.md`). Mitigation: the file is short, neutral, and clearly marked as project-owned. Projects that don't want it can delete the file and remove `story.modelHints` from `doccraft.json` after `init`.
- **Migration in an existing project that already has a file at `docs/reference/model-hints.md`**: the migration step is "create if missing", never "overwrite". Mitigation explicit in the manifest's `steps[]`.

## Migration Plan

This change is **purely additive**:

1. **New projects** — `doccraft init` writes `doccraft.json` with `story.modelHints` set, plus `docs/reference/model-hints.md` from the neutral template.
2. **Existing projects** — `doccraft update` reads the manifest, surfaces the migration entry, and on approval applies the steps (add field; create registry from template if missing; optionally invoke `doccraft-config`).
3. **Rollback** — remove `story.modelHints` from `doccraft.json`. The integration block disappears on the next `doccraft update`. The registry file can be deleted manually if the user no longer wants it.

No data migration, no breaking schema change, no template churn beyond one new placeholder + one new template file + one updated default scaffold.
