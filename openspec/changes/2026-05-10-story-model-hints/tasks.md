## 1. Schema and config

- [ ] 1.1 Add optional `story.modelHints` (string, file path relative to project root) to `src/utils/config-schema.ts` with `description` and `examples`.
- [ ] 1.2 Regenerate `schema/doccraft.schema.json` from the updated source.
- [ ] 1.3 Verify the schema build still passes the "every property has a description" check.
- [ ] 1.4 Add a config-loader test asserting the field is optional and round-trips faithfully when present.

## 2. Skill template + renderer

- [ ] 2.1 Add `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder to `templates/skills/doccraft-story/SKILL.md` at the bottom of the body (after `{{BUSINESS_INTEGRATION_BLOCK}}`).
- [ ] 2.2 Add `MODEL_HINTS_BLOCK_STORY` constant to `src/utils/skills.ts` with the canonical block text from `design.md` §"Skill block content".
- [ ] 2.3 Add `applyModelHintsBlock(raw, config, skillName)` mirroring `applyBusinessBlock`. Activation rule: `config.story?.modelHints` is a non-empty string. The rendered block uses `{{DOCS_DIR}}` substitution like the business block.
- [ ] 2.4 Wire `applyModelHintsBlock` into the existing skill-render pipeline (called for every templated skill so the placeholder is always resolved; only `doccraft-story` actually contains the placeholder).
- [ ] 2.5 Test that with `modelHints` set, the rendered `doccraft-story` SKILL.md contains the integration block and the registry path is substituted.
- [ ] 2.6 Test that with `modelHints` absent (or empty string), the rendered SKILL.md has no leftover placeholder, no extra blank lines, and is byte-identical to today's output for projects that don't opt in.

## 3. Assisted setup — `doccraft init`

- [ ] 3.1 In `src/commands/init.ts`, after the existing scaffold logic, add a TTY-gated prompt: *"Enable per-story model hints? \[no/use existing path/scaffold\]"*.
- [ ] 3.2 On `no` → skip (do not write `story.modelHints`).
- [ ] 3.3 On `use existing path` → prompt for the path, persist it into `doccraft.json`, warn if the file does not exist (do not fail).
- [ ] 3.4 On `scaffold` → create a starter file at the user-provided path (default `docs/reference/model-hints.md`) using `templates/docs/reference/model-hints.md` (new template; minimal skeleton describing the conventions). Persist the path. Print a one-line follow-up suggesting the user fill it in (or invoke their LLM to draft from a description).
- [ ] 3.5 Non-interactive (no TTY) → skip the prompt silently; document in CLI help.
- [ ] 3.6 Test: TTY=on + `no` → no field written; TTY=on + `use existing path` with valid path → field persisted; TTY=on + `scaffold` → field persisted *and* file created from template; TTY=off → no prompt, no field written.

## 4. Migration hint — `doccraft update`

- [ ] 4.1 In `src/commands/update.ts`, after the existing version-bump and skill-render logic, check whether `config.story?.modelHints` is set.
- [ ] 4.2 If unset, emit a single-line migration hint to stdout: *"Tip: run `doccraft-config` to enable per-story model hints (new in this version)."* Only emit when the version stamp is being raised across the version that introduces the field (one-time per project).
- [ ] 4.3 Track "already shown" state via a small marker key in `doccraft.json` (e.g. `_seen.modelHintsHint: true`) so the message does not nag on subsequent updates. The marker key is namespaced under `_seen` to avoid polluting the documented schema; schema permits unknown `_seen` content.
- [ ] 4.4 Do **not** prompt interactively during `update`; the prompt belongs in `init` and in the `doccraft-config` skill.
- [ ] 4.5 Test: update against a config without `modelHints` and without the marker → emits the hint and writes the marker; subsequent update → no hint emitted.

## 5. Registry file template

- [ ] 5.1 Add `templates/docs/reference/model-hints.md` as a **neutral skeleton** that does not assume the project's model topology:
  - Header explaining the file is project-owned and the schema does not validate its content.
  - "Available models" section with placeholder rows the user fills in with whichever models they have (no local/cloud framing).
  - "Label vocabulary" section with placeholder labels and one-line guidance per label, framed as project-defined examples only.
  - "Decision rules" section (optional content, mandatory header) explaining how labels combine for a story — single model, ordered fallback, multi-model collaboration — left for the user to fill in.
  - "Per-story mapping" empty table.
  - Footer pointer to the originating change so future doccraft versions can update the template via `doccraft update` if needed.
- [ ] 5.2 Verify the template makes no reference to specific runtimes (no `llama-swap`, no `cursor`, no `qwen`, no specific cloud provider). The template is the *contract about how to describe a project's setup*, not a reflection of any one project's setup.
- [ ] 5.3 Wire the template into the `init --scaffold` path under task 3.4.

## 6. Documentation

- [ ] 6.1 Add a paragraph to `README.md` under the existing "Optional features" section describing model hints, with a one-line example.
- [ ] 6.2 Add an entry to `docs/stories/` for this change (P-tier per project conventions).
- [ ] 6.3 Add an ADR under `docs/adr/` capturing the decision to use a presence-gated string field rather than `features` enum or discriminated union.

## 7. Release

- [ ] 7.1 Confirm semver impact: **minor** bump (additive optional field, no breaking changes to existing skills or schemas).
- [ ] 7.2 Update `CHANGELOG.md` with the user-facing description.
- [ ] 7.3 Run full test suite and the `npx doccraft@latest llm` migration manifest check.
- [ ] 7.4 Tag release; GitHub Action publishes to npm.
- [ ] 7.5 Verify jsDelivr serves the new schema at `https://cdn.jsdelivr.net/npm/doccraft@<NEW>/schema/doccraft.schema.json`.

## 8. Downstream verification (any consuming project as test bed)

After release, in any project that has opted in:

- [ ] 8.1 Run `doccraft update`. Expect: version bump in `doccraft.json`, migration hint emitted on the **first** update, marker key written.
- [ ] 8.2 Set `story.modelHints: "<project-chosen-path>"` and re-render skills (`doccraft update`). Expect: `.claude/skills/doccraft-story/SKILL.md` and the equivalent under `.cursor/skills/` now contain the integration block with the substituted path.
- [ ] 8.3 Author the registry file with whatever model list and label vocabulary the project chooses. Verify the rendered SKILL.md instructs the agent to read this file and use *its* labels (not any baked into doccraft).
- [ ] 8.4 Author or edit at least one story with the skill active; verify the agent suggests a `model_hint:` Notes line drawn from the registry's labels and grounded in the story's tags/impact/urgency/body.
- [ ] 8.5 Confirm `doccraft-queue-audit` runs unchanged and emits no spurious advisory.

The verification is intentionally project-agnostic: it must work for projects with one cloud model, multiple cloud tiers, one or more local models, or any mix.
