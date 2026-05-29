## Context

The extension framework that just shipped (ADR 013, version 4.0.0) introduced
the `<!-- doccraft:inject point=... -->` marker syntax with a single directive
type and an enumerated list of injection points. ADR 014's design explicitly
called out that the marker mechanism is forward-compatible: "the generalised
form is `<!-- doccraft:<directive> <attrs?> -->`" and "the same marker
mechanism is forward-compatible with ADR 014: `<!-- doccraft:packages -->`
will use the same parser, dispatching to a package-list renderer instead of
an extension-fragment concatenator."

This change cashes that check. The work is:

- Add a second directive (`doccraft:packages`) to the marker parser.
- Add a schema field (`packages: [{ path }]`) and a loader.
- Add a scaffold step that mirrors `scaffoldDocsIfMissing` for each
  declared package root.
- Update four skill bodies (mostly prose) to teach Claude about the
  namespaced-id convention and the package-context resolution rules.

audio-stage just migrated to 4.0.0. It has no `packages: []` yet — so
nothing in this change should perturb the audio-stage install until it
opts in. Additive-only is a hard constraint.

## Goals / Non-Goals

**Goals:**
- Single marker parser handles both `doccraft:inject` and
  `doccraft:packages` directives. No second-parser, no second
  substitution path.
- `packages: []` (or absent) produces byte-identical baked skills to
  pre-change behavior. Verified by an explicit test.
- Per-package scaffold uses the same walker/never-overwrite semantics
  as `scaffoldDocsIfMissing`. One implementation shared between root
  and packages.
- Skill bodies teach the namespaced-id convention via prose; no enum
  validation of namespace prefixes (the prefix is just the last segment
  of the declared package path).
- Determinism: identical inputs produce byte-identical output across
  runs. Same test pattern as the extensions work.
- Hard-error on malformed `packages[]` entries at update time (same
  loudness as the extension loader).

**Non-Goals:**
- Workspace-glob auto-discovery (pnpm workspaces, lerna, etc.). Explicit
  list only.
- Cross-package dependency graph validation in code. The queue-audit
  skill teaches Claude the rules; doccraft itself doesn't parse story
  frontmatter or build a graph. Same stance as today.
- A separate "aggregate view" file written to disk. Aggregate is a
  prompt-driven behavior — the user asks "what's unblocked anywhere",
  and queue-audit walks all package docs/ trees in that turn.
- Epics. Documented as an extension responsibility in ADR 014 §6;
  audio-stage carries it (or not). Not core.
- Bidirectional path-to-namespace inference for arbitrary directory
  trees. The package slug is exactly the last path segment of the
  declared package path. `packages/audio-engine` → slug
  `audio-engine`. The user is responsible for choosing distinct slugs;
  collisions are a hard error.

## Decisions

### 1. Directive name as a regex capture; dispatch in code

```typescript
const DIRECTIVE_REGEX =
  /<!--\s*doccraft:([a-z][a-z0-9-]*)(\s+[^>]*)?\s*-->[\s\S]*?<!--\s*\/doccraft:\1\s*-->/g;
```

The first capture is the directive name (`inject`, `packages`). The
existing `point=...` attribute parsing for `inject` moves to a small
attribute parser called only on the inject branch. `packages` takes no
attributes in v1.

`bakeSkill` runs the regex once per template, dispatches each match by
directive name. Unknown directives → hard error
(`unknown doccraft directive in template <skill>: <name>`). This catches
typos like `<!-- doccraft:pakcages -->` that would otherwise silently
no-op.

**Alternatives considered:**
- A second regex for `doccraft:packages` — rejected. Two passes over
  the template double the work for no benefit, and each new directive
  would double again. Single-regex dispatch is the right shape.
- Treat `<!-- doccraft:packages -->` as a special-case `inject` with
  `point=packages` — rejected. The semantics are different
  (rendering a generated block vs concatenating fragments). Conflating
  them would muddy the injection-point taxonomy contract that ADR 013
  spec-froze.

### 2. Packages renderer — small, deterministic, project-agnostic

When `packages[]` is non-empty, the packages directive region is
replaced with this exact block (with `<docsDir>` substituted to the
configured value):

```markdown
## Known package roots

This project declares the following package roots. Each has its own
`<docsDir>/` tree (stories, ADRs, queue, backlog) mirroring the
project-root structure.

- `<slug-1>` — `<path-1>/<docsDir>/`
- `<slug-2>` — `<path-2>/<docsDir>/`

When a `depends_on`, `adr_refs`, or queue reference uses the form
`<slug>/STR-NNNN` or `<slug>/NNN-...md`, resolve the path against the
matching root above. References without a slug prefix refer to the
project-root `<docsDir>/`.
```

The slug is `path.basename(packagePath)`. Slugs must be unique across
the manifest; duplicates → hard error at load.

When `packages[]` is empty or absent, the directive region is stripped
the same way an empty `inject` region is stripped (markers + one
trailing newline removed).

**Alternatives considered:**
- Configurable rendering template — rejected as YAGNI. The whole point
  of baking is determinism; let projects override skill bodies via the
  existing inject mechanism if they want different wording.
- Include the package descriptions / READMEs in the rendered block —
  rejected. Would make the block large and noisy; skills only need
  the path mapping to resolve references.

### 3. Schema shape — match the extensions field

```typescript
packages: {
  title: 'Monorepo package roots',
  description:
    'Ordered array of package directories that opt into doccraft planning. Each entry declares a path (relative to the project root) under which the same docs/ skeleton — stories, ADRs, queue, backlog — is scaffolded and managed. Declaration order is significant for the rendered package list in skill bodies. Absent or empty preserves single-root behavior. Slugs (the last path segment) must be unique. See ADR 014 in the doccraft repo for the convention.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      path: {
        title: 'Package directory path',
        description: 'Path to the package directory containing the docs/ tree, relative to the project root.',
        type: 'string',
        examples: ['packages/audio-engine', 'packages/ui-shell'],
      },
    },
    required: ['path'],
  },
  examples: [[], [{ path: 'packages/audio-engine' }, { path: 'packages/ui-shell' }]],
}
```

Mirrors the `extensions[]` shape exactly so the schema looks consistent
to schema-aware editors and the doccraft-config skill.

### 4. Per-package scaffold — share the walker with root

`scaffoldDocsIfMissing` already walks `templates/docs/` and writes
missing files. Refactor it to expose a helper that takes a target root
and walks. Use it for both root (single call) and each declared
package (one call per package). Same never-overwrite semantics; same
created-list return shape.

The package scaffold runs **after** root scaffold and extension
scaffold. Order matters only for path-collision tiebreaks, which
shouldn't happen because package targets live under
`<package-path>/...` and root targets live at the project root.

### 5. Skill body updates — prose only

The skill bodies are how Claude learns the rules. The new prose
sections each skill needs:

- **doccraft-story** — a "Package context" subsection near the top of
  the body, after `## Configuration`. Explains the explicit `package:`
  arg, active-file inference fallback, and root default. Lists slug
  semantics. Documents the `pkg/STR-NNNN` form used in `depends_on`.
  Plus the `<!-- doccraft:packages -->` directive marker positioned at
  the start of this subsection so the rendered list lands above the
  resolution rules.

- **doccraft-adr** — a "Package context" subsection mirroring story.
  Documents `pkg/NNN-slug.md` in supersession refs and `adr_refs`
  fields. Same marker placement.

- **doccraft-queue-audit** — a "Multi-package scope" section explaining:
  per-package queue + backlog reconciliation; cross-scope
  `depends_on` walking; aggregate-view behavior when the user asks
  "anywhere"; precedence rules when a story in package A depends on a
  story in package B that's `status: in_progress`. Marker placed at
  the top of this section. Plus a small note in the existing
  "Stop and report" list: when the active scope is unclear (no
  explicit `package:` arg and the user pastes a graph spanning
  multiple packages), report and ask rather than guessing.

- **doccraft-session-wrap** — a small "Package routing" note in the
  output-format section: when proposing artifacts, pick the package
  whose body the conversation referenced most. Marker placed before
  the docs-map table so the available roots are visible when the LLM
  decides where to file artifacts.

Other skills (`doccraft-config`, `doccraft-update`) get no markers and
no body changes. They're infrastructure skills (per ADR 013 §7) and
nothing about config-editing or update-flow is package-scoped.

### 6. Error semantics

| Condition | Error |
|-----------|-------|
| `packages[i]` not an object with `path` field | `doccraft.json: packages[<i>] must be an object with a "path" field` |
| `packages[i].path` not a string | `doccraft.json: packages[<i>].path must be a non-empty string` |
| Two entries produce the same slug | `duplicate package slug "<slug>" (paths <a> and <b>)` |
| Unknown directive name in template | `unknown doccraft directive in template <skill>: <name>` |
| Duplicate `doccraft:packages` marker in one template | `duplicate doccraft:packages marker in template <skill>` |

Package directory existence is **not** validated at load (unlike
extensions). Reason: a user adding a new package may not have created
its directory yet — they want `doccraft update` to scaffold it. The
package-list block still renders, and the per-package scaffold creates
the tree.

### 7. Version bump — 4.1.0

Additive schema field, additive directive, additive scaffold step. No
existing test scenarios change behavior. Minor bump under
semantic-release (`feat:` commit, no `!`).

## Risks / Trade-offs

- **Risk:** packages directive marker present in templates but the user
  hasn't declared `packages[]`. The markers strip cleanly to nothing
  on bake — same as empty `inject` regions. → **Mitigation:** the
  existing strip-empty-region path is reused; a regression test
  asserts byte-identical output between "no marker in template" and
  "marker present, packages[] empty" baked outputs.

- **Risk:** duplicate slug collision when a user has two packages with
  the same last path segment (`packages/a/foo` and `packages/b/foo`).
  → **Mitigation:** detected at load with a clear error naming both
  paths. User picks one, renames or restructures.

- **Risk:** scaffolding into `<package-path>/<docsDir>/` creates an
  unwanted `docs/` directory in a package that hasn't opted into
  planning. → **Mitigation:** opt-in is explicit (the user added the
  package to `doccraft.json`). The eval-package precedent — directory
  exists for ops, not for planning — is precisely the auto-discovery
  trap this design avoids. Scaffolding only runs for declared
  packages.

- **Risk:** the markers land in `templates/skills/` ahead of the
  packages-list renderer being implemented. → **Mitigation:** all
  template edits and code changes go in one commit; intermediate state
  doesn't exist on a published version. Local builds during
  development that hit an unimplemented directive will hard-error
  visibly (matches the "fail loud" stance).

- **Trade-off:** the skill body rewrites are mostly prose. Quality
  depends on Claude's prompt-following more than code coverage. The
  vitest suite checks that the markers are present and that the
  baked sections appear, but it can't assert prompt efficacy. That's
  consistent with how ADR 013 handled the same concern for inject
  fragments.

- **Trade-off:** no graph validation in code means projects with
  cycles or unknown `pkg/STR-NNNN` refs will catch issues only when
  the queue-audit skill runs. Acceptable — graph validation in
  TypeScript would force doccraft to parse story frontmatter, which
  it has explicitly avoided to date.

## Migration Plan

This change is additive and ships in 4.1.0. No in-product migration
tooling, no breaking removals.

Path for audio-stage (the only consumer) to opt in:

1. `pnpm add -D doccraft@4.1.0` (or rely on `npx doccraft@latest`).
2. Edit `doccraft.json` to add `packages: [...]` listing the packages
   that should host their own planning (e.g. `packages/audio-engine`,
   `packages/ui-shell`). Intentionally omit `packages/eval` since its
   `docs/` is ops, not planning.
3. Run `npx doccraft@4.1.0 update . --skip-openspec`. Doccraft
   scaffolds the missing `docs/` skeleton under each package and
   bakes the package-list block into the four core skill bodies.
4. (Optional) Move existing stories from root `docs/stories/` into
   per-package `docs/stories/` and renumber ids with the namespace
   prefix. This is a manual story-tree migration; doccraft doesn't
   automate it.
5. Existing root-scope ids continue to work; mixed root + namespaced
   `depends_on` lists are valid per the rendered package-list block.

Rollback: delete `packages[]` from `doccraft.json`, run update. The
package-list block disappears from skill bodies; previously-scaffolded
per-package `docs/` trees stay on disk (the user owns those files
post-scaffold).

## Open Questions

None blocking. One follow-up worth tracking for after audio-stage opts
in: whether `doccraft-queue-audit` needs a structured machine-readable
aggregate output (e.g. a generated file) for tooling that wants to
consume it. v1 keeps aggregate as prompt-driven prose; revisit only if
a real tooling need surfaces.
