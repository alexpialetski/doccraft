## Context

Doccraft already has a precedent for **conditional integration blocks** in skill templates: the `business` feature (see `src/utils/skills.ts:269-316`) renders `{{BUSINESS_INTEGRATION_BLOCK}}` differently based on whether `"business"` appears in `doccraft.json.features`. The same machinery is the right shape for model hints — the only difference is that model hints are not a global feature flag but a presence-gated optional field.

This change spans:

1. **Schema** — one optional string field under `story`.
2. **Renderer** — a new block-substitution branch in `src/utils/skills.ts` keyed on the field's presence, not on `features`.
3. **Lifecycle** — `init` and `update` add user-facing prompts so the feature surfaces without requiring users to read the changelog.
4. **Skill template** — `doccraft-story` adds a `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder (the only template touched).

## Goals / Non-Goals

**Goals:**

- Add `story.modelHints` as an optional `string` (file path) in `doccraft.json`. **No** inline registry, **no** discriminated union — keep the schema simple.
- When set, render an integration block in `doccraft-story` SKILL.md that instructs the skill to read the registry file before authoring/editing stories.
- When unset, render the SKILL.md exactly as today (no whitespace artefacts, no leftover placeholder).
- Assisted setup during `init` and `update` so users discover the feature without reading the changelog.
- No format mandate on the registry file: it is **project-owned**. The skill block tells the agent *to read it* and *use whatever labels the user defines there*.

**Non-Goals:**

- Inline registry inside `doccraft.json` (rejected — complicates schema; the value of a markdown registry is human-readable prose with a Notes-line vocabulary the user controls).
- Validating the registry file's content or shape (rejected — it is project-owned; doccraft does not own the labels).
- A `model_hint:` frontmatter field with a fixed enum (rejected for the same reason — the labels are project-defined, so they live in the body Notes section under whatever label format the registry establishes).
- A `features` enum entry (rejected — that mechanism is for *package-level* opt-ins like `business`/`design` that install extra skills or run subprocesses; model hints adds nothing to install).
- Cursor-specific / llama-swap-specific assumptions in the skill block (rejected — the block stays runtime-agnostic; users name their models in their own registry).

## Decisions

### Field shape: presence-gated optional string, no inline form

`story.modelHints` is an optional string; its value is a path relative to the project root pointing at a markdown file. The schema does **not** validate that the file exists (init/update can warn; queue-audit and story skill behaviour are unaffected by file absence — the agent will say it could not read the file).

```jsonc
{
  "story": {
    "modelHints": "docs/reference/model-hints.md"
  }
}
```

**Alternatives considered:**

- **Discriminated union** `{ $ref?: string, registry?: object }`: rejected per user direction. Adds schema complexity for marginal gain; markdown is the right format for human-readable per-task guidance, and small projects rarely need an inline form.
- **Object wrapper** `{ "modelHints": { "file": "..." } }`: rejected — single-purpose field; no future-proofing benefit visible today. If needed later, can be promoted to an object via a non-breaking minor (treat string-as-shorthand for `{ "file": "..." }`).
- **Filename glob**: rejected — registry should be a single file per project; multiple registries muddle the contract.

### Activation gating: presence, not `features` enum

`{{MODEL_HINTS_INTEGRATION_BLOCK}}` is replaced by the rendered block iff `config.story?.modelHints` is a non-empty string at the time of install/update. Otherwise the placeholder is replaced by the empty string (mirroring the `business`-feature-disabled path in `applyBusinessBlock`).

**Alternatives considered:**

- **`features: ["model-hints"]` opt-in**: rejected — the existing enum is for opt-ins that install skills (`business` adds `doccraft-business`) or run subprocesses (`design`); model hints does neither. Reusing the enum here would be misleading.
- **Always render the block, with a "configure to enable" hint**: rejected — adds noise to projects that have not opted in. Prefer absent-by-default semantics.

### Assisted setup wiring

`doccraft init` and `doccraft update` get a small **assisted-setup** prompt for model hints, gated as follows:

- **`init`**: after persisting other fields, ask: *"Enable per-story model hints? (Helps annotate stories with which model is appropriate for the work.)"* Three answers:
  - `no` → skip; `story.modelHints` not written.
  - `existing path` → user types or accepts the suggested path; written into config without checking the file exists (warn if missing).
  - `scaffold` → create a starter file at `docs/reference/model-hints.md` (or a path the user gives) from a neutral template that explains how to describe the project's available models and label vocabulary. The template makes no assumption about whether models are local, cloud, or mixed. The LLM running `doccraft` can extend the scaffold with the user's actual model list — that step is *user × agent*, not part of doccraft's job.

- **`update`**: when the resolved config does **not** have `story.modelHints` and the version stamp is being bumped past the version that introduced it, emit a single-line migration hint suggesting the user run `doccraft-config` to enable the feature. Do **not** prompt interactively during update unless the user asked for assisted setup explicitly.

**Alternatives considered:**

- **Silent introduction**: rejected — the user explicitly asked for a migration prompt. New optional fields are easy to miss.
- **Forced prompt every update**: rejected — annoying after the user has decided no.

### Skill block content (canonical)

```markdown
## Model hints

This project's `doccraft.json` declares `story.modelHints: "<PATH>"`. Before authoring or editing a story:

1. **Read** the registry at `<PATH>`. Treat it as the project's source of truth for which models are appropriate for which kind of work, and how to combine them when a story benefits from more than one.
2. **Combine the registry's guidance with the story's context** — tags, impact, urgency, body — to choose a recommendation. The registry defines which axes matter (e.g. cost, speed, reasoning depth, code-grounding, runtime); doccraft does not.
3. **Suggest a `model_hint:` annotation** in the story's Notes section using *only* the labels the registry defines. Do not invent new labels — if nothing fits, propose extending the registry instead.
4. When updating an existing story, leave the existing `model_hint:` line in place unless it contradicts the story body or the registry's guidance has changed.

The label vocabulary, the model list, and the decision rules are **project-defined**, not doccraft-defined. The registry is the contract.
```

The block is rendered into `doccraft-story` SKILL.md only. `doccraft-queue-audit` is **not** changed in this iteration — model hints do not affect dependency graphs, urgency, or queue ordering.

### Registry file shape (advisory, not mandated)

The change ships a **neutral template** for `docs/reference/model-hints.md` that users can edit, but the schema does not enforce its structure. The template demonstrates the conventions without prescribing a topology:

- An "Available models" section the user fills in with whatever models the project has access to (one model per row or short paragraph).
- A "Label vocabulary" section where the user defines the labels they will use and what each label means.
- Optionally a "Decision rules" section describing how the labels combine for a given story (e.g. when a label maps to a single model vs an ordered fallback chain).
- Optionally a "Per-story mapping" table for an authoritative live list.

The template explicitly does not assume local-vs-cloud, free-vs-paid, fast-vs-slow, single-model-vs-combination, or any other axis. Projects with one cloud provider, projects with a multi-tier cloud setup, projects with multiple local models swapped through a supervisor, and projects mixing all of the above all describe their setup the same way: in their own words, in their own registry.

## Risks / Trade-offs

- **Registry file drift** — the file is project-owned, so it can become stale. Mitigation: the rendered block tells the agent to read it on every story authoring/edit; stale guidance becomes visible at story-author time, not on a hidden cron.
- **Label vocabulary becomes a snowflake per project** — accepted; this is the same trade-off as `area:`/`slice:`/`theme:` tags being project-defined. The registry file is the single source of truth.
- **No schema validation on registry content** — accepted; doccraft does not own the labels. The skill block tells the agent to read the file and use *its* labels, which means the user's registry is authoritative.
- **Assisted-setup interactivity in `init`/`update`** — small UX risk if non-interactive runs hit the prompt. Mitigation: gate the prompt behind the same TTY check the existing flow uses; in CI, default to "no" and skip silently.

## Migration Plan

This change is **purely additive**:

1. Existing projects: nothing changes until `doccraft update` runs against the new version. After update, the migration hint surfaces; the user can choose to enable model hints or ignore it.
2. New projects: `doccraft init` asks the question once; default-no.
3. Rollback: remove `story.modelHints` from `doccraft.json`. The integration block disappears on the next `doccraft update`.

No data migration, no breaking schema change, no template churn beyond one new placeholder.
