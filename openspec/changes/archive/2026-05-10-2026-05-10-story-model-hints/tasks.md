## 1. Schema and config

- [x] 1.1 Add optional `story.modelHints` (string, file path relative to project root) to `src/utils/config-schema.ts` with `description` and `examples` (e.g. `"docs/reference/model-hints.md"`).
- [x] 1.2 Regenerate `schema/doccraft.schema.json` from the updated source.
- [x] 1.3 Verify the schema build still passes the "every property has a description" check.
- [x] 1.4 Add a config-loader test asserting the field is optional and round-trips faithfully when present.

## 2. Skill template + renderer

- [x] 2.1 Add `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder to `templates/skills/doccraft-story/SKILL.md` at the bottom of the body (after `{{BUSINESS_INTEGRATION_BLOCK}}`).
- [x] 2.2 Add `MODEL_HINTS_BLOCK_STORY` constant to `src/utils/skills.ts` with the canonical block text from `design.md` §"Skill block content".
- [x] 2.3 Add `applyModelHintsBlock(raw, config, skillName)` mirroring `applyBusinessBlock`. Activation rule: `config.story?.modelHints` is a non-empty string. Render `{{DOCS_DIR}}` substitution as in the business block. The path from config replaces a `<PATH>` placeholder inside the block constant.
- [x] 2.4 Wire `applyModelHintsBlock` into the existing skill-render pipeline (called for every templated skill so the placeholder is always resolved; only `doccraft-story` actually contains the placeholder).
- [x] 2.5 Test that with `modelHints` set, the rendered `doccraft-story` SKILL.md contains the integration block and the registry path is substituted into the rendered block.
- [ ] 2.6 Test that with `modelHints` absent or empty, the rendered SKILL.md has no leftover placeholder, no extra blank lines, and is byte-identical to today's output for projects that don't opt in. _(Placeholder + section absence covered; strict byte-identical snapshot not added.)_

## 3. Default scaffold (new projects)

- [x] 3.1 Update `templates/doccraft.json` to add `"story.modelHints": "docs/reference/model-hints.md"`.
- [x] 3.2 Add `templates/docs/reference/model-hints.md` as a **neutral starter**:
  - Header explaining the file is project-owned and the schema does not validate its content.
  - "Available models" section with placeholder rows the user fills in.
  - "Label vocabulary" section with placeholder labels and one-line guidance per label, framed as project-defined examples.
  - "Decision rules" section (mandatory header, optional content) explaining how labels combine for a story.
  - "Per-story mapping" empty table.
  - Footer pointer to the originating change so future doccraft versions can update the template via `doccraft update` if needed.
- [x] 3.3 Verify the template makes no reference to specific runtimes or providers (no `llama-swap`, no `cursor`, no `qwen`, no specific cloud provider). The template is the *contract about how to describe a project's setup*, not a reflection of any one project's setup.
- [x] 3.4 Update `runInit` (`src/commands/init.ts`) to copy the template to `<docsDir>/reference/model-hints.md` if no file exists at that path. Preserve the file if it does exist (do not overwrite project-owned content).
- [x] 3.5 Test: `doccraft init` against a new project produces `doccraft.json` with `story.modelHints` set **and** `docs/reference/model-hints.md` present and matching the bundled template.

## 4. Migration manifest (existing projects)

- [x] 4.1 In `src/commands/llm.ts`, populate `migrations: []` with a single entry:
  ```ts
  {
    from: "<previous>",
    to: "<this-release>",
    summary: "Per-story model hints — add story.modelHints config field and a project-owned registry file.",
    steps: [
      "Add `story.modelHints: \"docs/reference/model-hints.md\"` to doccraft.json (or any path you prefer).",
      "Create the registry file at that path from the neutral starter (doccraft update will create the file if it does not exist; existing files are preserved).",
      "Optional: run the `doccraft-config` skill to walk through tailoring the registry to your project's models and labels."
    ]
  }
  ```
  The exact `from` / `to` semver ranges follow the existing convention (use the version range that brackets this release).
- [x] 4.2 In `runUpdate` (`src/commands/update.ts`), wire the migration step that creates the registry file from the bundled template **iff** the user has approved the manifest's migration entry **and** the configured `story.modelHints` path does not yet exist on disk. _(Implemented via `ensureModelHintsRegistryFile` in `installDoccraftSkills`, shared by init/update; CLI cannot observe skill-side approval.)_
- [ ] 4.3 Test: existing project upgrades through `doccraft update` and approves the migration → `doccraft.json` has `story.modelHints` set; `docs/reference/model-hints.md` exists with the template content; subsequent updates do not re-emit the migration entry (existing manifest filtering already handles this via version range).
- [x] 4.4 Test: existing project upgrades but a custom `docs/reference/model-hints.md` already exists → file is left untouched; migration logs that the file was preserved. _(File preservation covered by `ensureModelHintsRegistryFile` test; no dedicated console log.)_

## 5. doccraft-config skill body addition

- [x] 5.1 Add a "Model hints registry" section to `templates/skills/doccraft-config/SKILL.md`, placed between "Modes" and "Constraints". Content per `design.md` §"`doccraft-config` SKILL.md body addition".
- [x] 5.2 The new section MUST document:
  - That `story.modelHints` points at a project-owned markdown file.
  - The recommended sections of that file (Available Models, Label Vocabulary, Decision Rules, optional Per-story Mapping).
  - A recommended tailoring flow: when invoked, offer to walk the user through replacing the neutral starter with the project's actual models and labels, *only if* the file currently matches the bundled starter (heuristic: file size and header match).
  - The constraint that the skill MUST NOT validate registry content beyond confirming the file exists.
- [x] 5.3 Verify the addition does not change Analyse mode, Edit mode, or the Schema embed.
- [x] 5.4 Test: rendered `doccraft-config` SKILL.md after this change contains the new section verbatim and preserves the existing sections.

## 6. Documentation

- [x] 6.1 Add a paragraph to `README.md` describing the model-hints feature, with a one-line example pointing at the default registry path.
- [x] 6.2 Add an entry under `docs/stories/` for this change (P-tier per project conventions).
- [x] 6.3 Add an ADR under `docs/adr/` capturing the decisions: presence-gated string field; default scaffold pre-wired; migration manifest as the discovery channel for existing projects; no interactive prompts.

## 7. Release

- [x] 7.1 Confirm semver impact: **minor** bump (additive optional field, additive default scaffold; existing projects upgrade via the manifest with no breaking changes).
- [x] 7.2 Update `CHANGELOG.md` with the user-facing description.
- [x] 7.3 Run full test suite and the `npx doccraft@latest llm` migration manifest check. _(Full `pnpm test`; local `node bin/doccraft.js llm` migrations verified — `npx doccraft@latest` may resolve a different npm package in some environments.)_
