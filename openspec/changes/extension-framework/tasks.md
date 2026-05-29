## 1. Config schema — add extensions[], remove features and story.modelHints

- [x] 1.1 Add `extensions` array to `DOCCRAFT_CONFIG_SCHEMA` in `src/utils/config-schema.ts` with required `path` field, description, and at least one example entry
- [x] 1.2 Remove `features` array from `DOCCRAFT_CONFIG_SCHEMA`
- [x] 1.3 Remove `story.modelHints` field from `DOCCRAFT_CONFIG_SCHEMA` (and clean up the `story` object if it becomes empty)
- [x] 1.4 Run `pnpm run build` and verify `schema/doccraft.schema.json` reflects the new shape (no `features`, no `story.modelHints`, has `extensions`)
- [x] 1.5 Update `templates/doccraft.json` scaffold: remove `features` if present, remove `story.modelHints` from default, leave `extensions` absent (default)

## 2. Extension manifest loader and validator

- [x] 2.1 Create `src/utils/extensions.ts` exporting `VALID_INJECTION_POINTS` (the 10-entry enumerated list from the design)
- [x] 2.2 Export `loadExtensions(projectPath: string): Promise<LoadedExtension[]>` that reads `doccraft.json.extensions[]`, walks each path, parses `extension.yaml`, and returns validated `LoadedExtension` objects
- [x] 2.3 Implement manifest validation: required `name`, optional `version`, optional `injects[]` (each with required `skill`, `point`, `fragment`), optional `scaffold[]` (each with required `source`, `target`)
- [x] 2.4 Validate `skill` against the four core skill names (`doccraft-story`, `doccraft-adr`, `doccraft-queue-audit`, `doccraft-session-wrap`); reject `doccraft-config` and `doccraft-update` with a specific error message
- [x] 2.5 Validate `point` against `VALID_INJECTION_POINTS`; error message must list valid points
- [x] 2.6 Validate fragment path existence at load time; absolute error not silent skip
- [x] 2.7 Validate scaffold `source` path existence at load time
- [x] 2.8 Add a YAML parser dependency if `js-yaml` is not already in `package.json` (check first; openspec uses YAML so it likely is)
- [x] 2.9 Write vitest suite `src/utils/extensions.test.ts` covering each error message and the happy path

## 3. Marker walker and baker

- [x] 3.1 In `src/utils/extensions.ts`, export `bakeSkill(rawTemplate: string, skillName: string, extensions: LoadedExtension[]): string`
- [x] 3.2 Use a regex to find every `<!-- doccraft:inject point=<name> -->` ... `<!-- /doccraft:inject -->` pair in the template, tolerating whitespace inside the markers
- [x] 3.3 For each marker pair, collect every `inject` entry from `extensions` whose `(skill, point)` matches; read each fragment file; concatenate in extension declaration order with a single blank line between contributions
- [x] 3.4 Replace the marker region (including both markers and any trailing newline) with the concatenated content; when there are zero matching fragments, strip the marker region entirely without leaving extra blank lines
- [x] 3.5 Detect duplicate markers (same point appears twice in one template) and throw with a clear error
- [x] 3.6 Extend `extensions.test.ts` with bake scenarios: single fragment, multi-fragment ordering, empty marker stripped, unknown point in template (treated as unknown injection point — error), duplicate point in template (error)
- [x] 3.7 Add a property-style test that runs `bakeSkill` twice on the same inputs and asserts byte-identical output

## 4. Scaffold copier

- [x] 4.1 In `src/utils/extensions.ts`, export `scaffoldExtensions(projectPath: string, extensions: LoadedExtension[]): Promise<string[]>` returning the list of newly-created file paths
- [x] 4.2 Walk each `scaffold[]` entry's source tree recursively, mirroring directory structure under the target
- [x] 4.3 Use the same never-overwrite semantics as `scaffoldDocsIfMissing` — skip existing files silently, no error
- [x] 4.4 Add tests covering: new directory created, existing file preserved, mixed (some new, some existing), missing source path errors out

## 5. Wire extensions into installSkills

- [x] 5.1 In `src/utils/skills.ts`, modify `installSkills` to accept extensions list (or load them inside) and pass each template through `bakeSkill` after `applyDocsDir` but before `injectManagedHeader`
- [x] 5.2 Remove the `feature:` frontmatter gate in `installSkills` (delete the early-continue branch and `getSkillFeature` helper)
- [x] 5.3 Remove `applyBusinessBlock`, `applyModelHintsBlock`, `BUSINESS_BLOCK_QUEUE_AUDIT`, `BUSINESS_BLOCK_STORY`, `MODEL_HINTS_BLOCK_STORY` constants and their call sites
- [x] 5.4 Remove `readFeaturesFromConfig`, `writeFeaturesToConfig`, `readStoryModelHintsFromConfig`, `ensureModelHintsRegistryFile` and their call sites
- [x] 5.5 Update `runInit` (`src/commands/init.ts`) to drop the `--features` flag handling, the `runDesignerSkills` call, and the `ensureModelHintsRegistryFile` call; call `scaffoldExtensions` after `scaffoldDocsIfMissing`
- [x] 5.6 Update `runUpdate` (`src/commands/update.ts`) to drop the `runDesignerSkills` replay; call `scaffoldExtensions` after `installDoccraftSkills`
- [x] 5.7 Delete `src/utils/designer-skills.ts` and remove its references from any imports

## 6. Update template skills with injection markers

- [x] 6.1 In `templates/skills/doccraft-story/SKILL.md`, replace any `{{BUSINESS_INTEGRATION_BLOCK}}` and `{{MODEL_HINTS_INTEGRATION_BLOCK}}` with the appropriate `<!-- doccraft:inject -->` marker pairs; add markers for `story.frontmatter.fields`, `story.body.sections`, `story.instructions` at sensible locations in the body
- [x] 6.2 In `templates/skills/doccraft-adr/SKILL.md`, add marker pairs for `adr.frontmatter.fields`, `adr.body.sections`, `adr.instructions`
- [x] 6.3 In `templates/skills/doccraft-queue-audit/SKILL.md`, replace `{{BUSINESS_INTEGRATION_BLOCK}}` with the `queue.instructions` marker pair; add a `queue.artifact-types` marker pair
- [x] 6.4 In `templates/skills/doccraft-session-wrap/SKILL.md`, add marker pairs for `session-wrap.artifact-types` and `session-wrap.instructions`
- [x] 6.5 Update `templates/skills/doccraft-config/SKILL.md` body text: describe `extensions[]` array, drop any references to `features[]`, `story.modelHints`, and design feature
- [x] 6.6 Grep templates to confirm no `{{BUSINESS_INTEGRATION_BLOCK}}` or `{{MODEL_HINTS_INTEGRATION_BLOCK}}` strings remain anywhere under `templates/skills/`

## 7. Remove the doccraft-business skill and the design subprocess

- [x] 7.1 Delete `templates/skills/doccraft-business/` directory entirely
- [x] 7.2 Confirm no other code path references `doccraft-business` (grep `src/`)
- [x] 7.3 Remove any references to `business-insights-extractor` from `.claude/skills/` if present in committed local state (per ADR 010, this lived under `.claude/skills/` in this repo as a maintainer tool — confirm whether to keep or drop)
- [x] 7.4 Delete `src/utils/designer-skills.ts`
- [x] 7.5 Remove `runDesignerSkills` imports from `init.ts` and `update.ts`
- [x] 7.6 Update CLI `--features` flag definition in `src/cli/index.ts` — remove the flag from `init` command parsing

## 8. Self-host: prove the framework works in this repo

- [x] 8.1 Run `pnpm run build && pnpm run dev:cli -- update . --skip-openspec` to regenerate this repo's `.claude/skills/` from the new template + (empty) extension set
- [x] 8.2 Verify the regenerated skills are clean: no stray markers, no empty `{{XYZ}}` placeholders, no blank-line artefacts where business/model-hints blocks used to live
- [x] 8.3 Create a throwaway test extension under a scratch path (e.g. `/tmp/doccraft-test-ext/`) with one `story.instructions` fragment; add it to this repo's `doccraft.json.extensions`; re-run update; verify the fragment appears in `.claude/skills/doccraft-story/SKILL.md`; revert the change

## 9. Tests and lint

- [x] 9.1 Run `pnpm run test` and resolve any failures; delete tests that covered removed features (business, design, model-hints helpers)
- [x] 9.2 Run `pnpm run typecheck` and resolve type errors from the deletions
- [x] 9.3 Run `pnpm run lint` and resolve any new lint findings

## 10. Docs and ADR housekeeping

- [x] 10.1 Update CLAUDE.md if any of the development-flow text refers to features, design, or model-hints specifically (most should be agnostic — only fix concrete mismatches)
- [x] 10.2 Update `docs/README.md` if it documents `features[]` or the design subprocess
- [x] 10.3 Add a one-line `Recently shipped` entry to `docs/queue.md` for ADR 013 + ADR 014 once both land
- [x] 10.4 Confirm `docs/adr/README.md` index reflects ADR 013, 014, and superseded 010, 011 (already done in this session, just verify)

## 11. Final verification

- [x] 11.1 Re-run `pnpm run build && pnpm run test && pnpm run lint && pnpm run typecheck` — all green
- [x] 11.2 Run `npx openspec validate extension-framework` to confirm the change validates
- [x] 11.3 Manually inspect `.claude/skills/doccraft-story/SKILL.md` and `.claude/skills/doccraft-queue-audit/SKILL.md` for visual cleanliness post-bake (no marker leftovers, no double-newline gaps)
- [x] 11.4 Stage all changes, run `git status` and verify the diff matches expectations from the proposal (additions, removals, no surprises)
