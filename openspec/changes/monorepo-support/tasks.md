## 1. Config schema — add packages[]

- [x] 1.1 Add `packages` array to `DOCCRAFT_CONFIG_SCHEMA` in `src/utils/config-schema.ts` (object with required `path` field, description, examples matching the design)
- [x] 1.2 Run `pnpm run build` and verify `schema/doccraft.schema.json` reflects the new `packages` entry
- [x] 1.3 Add a test in `test/skills.test.ts` (config-schema describe block) asserting `packages` is present in the schema

## 2. Generalize the marker parser to dispatch on directive

- [x] 2.1 In `src/utils/extensions.ts`, replace the existing `INJECT_MARKER_REGEX` and `OPEN_MARKER_REGEX` with a single directive-capturing regex matching `<!-- doccraft:<directive> [attrs?] -->` ... `<!-- /doccraft:<directive> -->`
- [x] 2.2 Refactor `bakeSkill` to walk every directive match, dispatch by name to a handler: `inject` (existing concatenation logic) vs `packages` (new renderer) vs unknown (hard error naming skill + directive)
- [x] 2.3 Move the `point=...` attribute parsing into the inject handler only
- [x] 2.4 Preserve all existing inject behaviour (single-fragment, multi-fragment, empty-strip, ordering, duplicate-marker error, unknown injection-point error) — every existing test in `test/extensions.test.ts` must still pass

## 3. Package loader and validator

- [x] 3.1 In `src/utils/extensions.ts` (or a new `src/utils/packages.ts` if the module gets crowded — judgment call), export `LoadedPackage { slug: string; path: string }` and `loadPackages(projectPath): Promise<LoadedPackage[]>`
- [x] 3.2 Read `doccraft.json.packages[]`, validate each entry: `path` string, non-empty
- [x] 3.3 Derive each slug via `path.basename(entry.path)`; collect duplicates; hard error naming both colliding paths if a slug appears twice
- [x] 3.4 Tolerate non-existent package directories at load time (unlike extensions) — they get scaffolded later
- [x] 3.5 Reject malformed entries with messages matching the design's error table
- [x] 3.6 Add tests in a new `test/packages.test.ts` (or extend `extensions.test.ts`) covering: empty array, absent field, malformed entry, non-string path, duplicate slugs across distinct paths, happy path with two packages

## 4. Packages directive renderer

- [x] 4.1 In the same module as the loader, implement `renderPackagesDirective(packages: LoadedPackage[], docsDir: string): string` that returns the exact block described in the design (or an empty string when `packages` is empty)
- [x] 4.2 Wire the renderer into the `packages` branch of the dispatch added in 2.2
- [x] 4.3 When the packages directive marker appears but `packages` is empty, the marker region is stripped using the same empty-region rule that `inject` uses (markers + one trailing newline removed)
- [x] 4.4 Detect duplicate `doccraft:packages` markers in one template; hard error
- [x] 4.5 Tests: marker rendered with 1 / 2 / 3 packages, marker stripped when packages absent / empty, marker stripped byte-identically to "marker not present" output, duplicate-marker error, mixed inject + packages markers in the same template both processed

## 5. Wire packages into installSkills and scaffold

- [x] 5.1 In `src/utils/skills.ts`, change `installSkills` to accept a `packages` parameter (alongside `extensions`); pass it through to `bakeSkill`
- [x] 5.2 In `installSkills`, thread `docsDir` to the bake call so the packages renderer can render package paths with the configured docsDir
- [x] 5.3 Refactor `scaffoldDocsIfMissing` to expose a shared `scaffoldDocsFromTemplate(targetDocsRoot)` helper; keep `scaffoldDocsIfMissing` as a thin wrapper that resolves the root path
- [x] 5.4 Add `scaffoldPackages(projectPath, packages, docsDir)` that loops over packages and calls the shared scaffolder against `<package.path>/<docsDir>/`, returning a flat list of newly-created paths (one combined list, like the existing helpers)
- [x] 5.5 In `src/commands/init.ts` (`installDoccraftSkills`), call `loadPackages`, pass to `installSkills`, then call `scaffoldPackages` after the extension scaffold; log the packages loaded and the count of files scaffolded per package
- [x] 5.6 In `src/commands/update.ts`, no changes needed beyond the shared helper picking up the new package phase (verify by reading)
- [x] 5.7 Tests: `installDoccraftSkills` with `packages: [{path: "packages/foo"}]` creates `packages/foo/docs/<every-template-file>` with managed semantics

## 6. Update template skill bodies

- [x] 6.1 In `templates/skills/doccraft-story/SKILL.md`, add a `## Package context` section near the top (after Configuration) that embeds the `<!-- doccraft:packages -->` marker, explains the namespaced-id form, and documents explicit-arg / active-file / root precedence; reference how `depends_on` may use the prefixed form
- [x] 6.2 In `templates/skills/doccraft-adr/SKILL.md`, mirror the same Package context section, adapted to ADRs (`<slug>/NNN-slug.md`, supersession refs, `adr_refs` in stories)
- [x] 6.3 In `templates/skills/doccraft-queue-audit/SKILL.md`, add a `## Multi-package scope` section that embeds the marker and documents: per-package queue + backlog reconciliation; cross-scope `depends_on` walking; aggregate-view behaviour when the user asks "anywhere"; precedence rules for cross-scope dependencies. Add a one-sentence note under "Stop and report": if the active scope is unclear, ask rather than guess
- [x] 6.4 In `templates/skills/doccraft-session-wrap/SKILL.md`, add a small `## Package routing` paragraph (with the marker) before the docs map table — proposals route to the package the conversation referenced most
- [x] 6.5 Verify with `grep -rn "doccraft:packages" templates/skills/` that each template has exactly one open + close pair

## 7. Self-host: verify the framework works in this repo

- [x] 7.1 `pnpm run build && node bin/doccraft.js update . --skip-openspec` in the doccraft repo (which has no `packages[]`); confirm the packages directive regions in `.claude/skills/` strip cleanly with no leftover markers or whitespace artefacts
- [x] 7.2 Add `packages: [{path: "/tmp/dc-pkg-test"}]` to `doccraft.json`, run update, confirm `/tmp/dc-pkg-test/docs/{README.md,backlog.md,queue.md,...}` is created; confirm the baked story / adr / queue-audit / session-wrap skills contain a Known package roots block naming `dc-pkg-test`; revert the change

## 8. Tests, lint, typecheck

- [x] 8.1 `pnpm run test` — all green; in particular, the existing extension tests should remain unchanged in count and outcome
- [x] 8.2 `pnpm run typecheck` clean
- [x] 8.3 `pnpm run lint` clean

## 9. Docs and ADR housekeeping

- [x] 9.1 Update `docs/queue.md` Recently shipped with a one-line entry for monorepo support
- [x] 9.2 Confirm `docs/adr/README.md` index has ADR 014 listed as Accepted (already done in earlier session, just verify)

## 10. Final verification

- [x] 10.1 Re-run `pnpm run build && pnpm run test && pnpm run lint && pnpm run typecheck` — all green
- [x] 10.2 `npx openspec validate monorepo-support` returns valid
- [x] 10.3 `git status` review: additive only — no unexpected deletions in src/, no edits to existing test scenarios that should keep working
