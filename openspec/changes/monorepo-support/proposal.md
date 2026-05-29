## Why

doccraft assumes a single `docs/` at the project root. audio-stage — the only
consumer — has grown into a pnpm monorepo where the root backlog already
spans hundreds of stories across unrelated packages, and `packages/eval/`
has independently started its own `docs/` folder for ops content. The drift
audit and follow-up design in
[ADR 014](../../../docs/adr/014-monorepo-package-docs.md) committed to
explicit per-package `docs/` opt-in with namespaced ids and a baked package
list. This change implements that ADR. ADR 013's marker mechanism is
already shipping; this change extends the same parser to a second directive
type (`doccraft:packages`) so we don't grow a parallel substitution path.

## What Changes

- Add `packages: [{ path }]` array to the `doccraft.json` schema. Paths are
  relative to project root; absence (or empty array) preserves today's
  single-root behavior byte-for-byte.
- Introduce a second directive in the marker parser:
  `<!-- doccraft:packages -->` ... `<!-- /doccraft:packages -->`. The
  baker dispatches on directive name (`inject` vs `packages`); the existing
  inject mechanism is unchanged. When `packages[]` is empty, the directive
  region is stripped (same empty-region rules as `doccraft:inject`).
- When `packages[]` is non-empty, the packages directive renders a small
  block naming each declared package and its `docs/` root, telling the
  skill how to resolve `pkg/STR-NNN` and `pkg/NNN-...md` references.
- Embed the `doccraft:packages` marker in the four core skill templates
  (`doccraft-story`, `doccraft-adr`, `doccraft-queue-audit`,
  `doccraft-session-wrap`) at sensible locations.
- Update skill template bodies to document, in body text:
  - The namespaced-id convention (`pkg-slug/STR-NNNN` and
    `pkg-slug/NNN-slug.md` for ADRs; no prefix = root scope).
  - The package context contract: explicit `package:` arg in the user's
    request wins; otherwise infer from the active file's path under a
    declared package root; otherwise default to root.
  - For `doccraft-queue-audit`: cross-scope `depends_on` handling, root +
    per-package queue reconciliation, and an opt-in aggregate view when
    the user asks "what can I work on next, anywhere".
- Add a `scaffoldPackages` step in the install pipeline: for each declared
  package, walk `templates/docs/` and write any missing files under
  `<package-path>/<docsDir>/...` with the same never-overwrite semantics
  `scaffoldDocsIfMissing` uses. Runs after the core scaffold + extension
  scaffold (so collisions defer to existing content).
- Console output during `init` / `update` reports declared packages and
  any files scaffolded under them.
- No CLI flag additions. No behavior change for projects with
  `packages: []` or no `packages` key.

## Capabilities

### New Capabilities
- `monorepo-packages`: Declarative per-package `docs/` opt-in. Covers
  the schema field, the baked package-list directive, the per-package
  scaffold step, the namespaced-id convention contract, and the skill
  package-context resolution rules.

### Modified Capabilities
- `json-config`: Schema gains `packages[]` (additive). No removals.
- `doccraft-update-skill`: Update flow gains a package-scaffold phase
  (between extension scaffold and the existing tail). No removals.
- `extensions`: The marker parser generalizes from one directive
  (`doccraft:inject`) to two (`doccraft:inject`, `doccraft:packages`)
  dispatched by name. The injection-point contract is unchanged; only
  the parser shape evolves to accept additional directive types.

## Impact

- **Code:**
  - `src/utils/config-schema.ts` — add `packages` array (object with
    required `path` field, description, examples).
  - `src/utils/extensions.ts` — generalize marker regex to capture
    directive name; add `bakePackagesDirective` renderer; refactor
    `bakeSkill` to dispatch by directive name; export
    `loadPackages(projectPath)` and `scaffoldPackages(projectPath,
    packages, docsDir)` helpers.
  - `src/commands/init.ts` and `src/commands/update.ts` (via
    `installDoccraftSkills`) — load packages, pass to `installSkills`
    for baking, call `scaffoldPackages` after the extension scaffold
    phase, report results.
  - `src/utils/skills.ts` — `installSkills` accepts `packages` in
    addition to `extensions`; passes them through to `bakeSkill`.
  - Template skills (`doccraft-story`, `doccraft-adr`,
    `doccraft-queue-audit`, `doccraft-session-wrap`) — embed
    `<!-- doccraft:packages -->` markers; add body sections explaining
    the namespaced-id convention, package-context resolution, and
    (for queue-audit) cross-scope handling + aggregate view.
- **Tests:** vitest covering schema validation (accept / reject /
  absent), packages directive bake (single, multiple, empty-strip),
  mixed `inject` + `packages` markers in one template, package
  scaffold (new files, existing preserved, missing source error),
  deterministic output across runs, and a duplicate-directive guard
  matching the existing `doccraft:inject` guard.
- **Templates:** `templates/docs/` is the seed source for both root and
  per-package scaffolds — no changes here, but the scaffold helper is
  refactored so both call sites share the walker.
- **Schema regen:** `pnpm run build` emits `schema/doccraft.schema.json`
  with the new `packages` entry. IDE tooling (jsDelivr-served schema)
  picks it up on the next published version.
- **External:** audio-stage's monorepo opt-in happens in a follow-up
  change in audio-stage (declare packages, run update, namespace the
  ids that should be package-scoped, optionally move stories to
  per-package `docs/`). Not in scope here.
- **Version bump:** Minor (4.0.0 → 4.1.0). Additive only; no breaking
  removals.
