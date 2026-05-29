# ADR 014: Monorepo support — per-package docs/ with namespaced ids

**Status:** Accepted
**Date:** 2026-05-29

## Context

doccraft assumes a single `docs/` at the project root. audio-stage —
the only consumer — has grown into a pnpm monorepo, and the planning
backlog at root is already unmanageable (hundreds of stories spanning
unrelated packages). The `eval` package has independently started a
`docs/` folder for ops/tooling docs (judges, datasets, model-cards),
confirming the pressure is real and already happening organically.

Three things must work for monorepo planning:

1. Each opted-in package has its own `docs/stories/`, `docs/adr/`,
   `docs/queue.md`, `docs/backlog.md` with the same structure as root.
2. Stories in one package can `depend_on` stories in another package
   without id collisions.
3. The root `docs/` remains a real planning surface for cross-cutting
   work (infra, repo-wide policy, anything not owned by a single
   package) — not just an aggregate index.

Constraints from the drift audit:

- The `eval` package's `docs/` is *operational* (datasets, run logs),
  not planning. A package having `docs/` does **not** imply opting in
  to doccraft planning. The opt-in must be explicit.
- Most packages won't need their own planning; the manifest is
  additive, not derived from workspace globs.

The user is the only consumer; breaking change is acceptable.

## Decision

### 1. Explicit `packages:` in `doccraft.json`

```json
{
  "docsDir": "docs",
  "packages": [
    { "path": "packages/audio-engine" },
    { "path": "packages/ui-shell" }
  ]
}
```

`packages: []` (the default) keeps the single-root behaviour.
`eval` is intentionally absent because its `docs/` is ops, not planning.
Workspace globs are **not** auto-resolved — explicit is grep-able and
survives workspace tooling changes.

Each declared package has its own `<package-path>/docs/` with the same
structure as root (`docs/stories/`, `docs/adr/`, `docs/queue.md`,
`docs/backlog.md`, `docs/README.md`). `docsDir` from config still
applies; each package's docs root is `<package-path>/<docsDir>`.

### 2. Namespaced story ids

Story ids carry a package namespace prefix:

- `STR-0042` — root-scoped story (no namespace = root `docs/`).
- `audio-engine/STR-0042` — story under `packages/audio-engine/docs/`.

Namespaces are the **package slug** (the last segment of the package
path) and must be unique across the manifest. Uniqueness of the
*numeric* portion is enforced **within each scope** — root and each
package have independent id spaces. `audio-engine/STR-0042` and
`ui-shell/STR-0042` are both valid.

`depends_on` and `adr_refs` may reference any scope:

```yaml
depends_on: [STR-0011, audio-engine/STR-0042]
adr_refs: [014-monorepo-package-docs.md, audio-engine/003-cue-fields.md]
```

ADR ids follow the same pattern (`audio-engine/003-cue-fields.md`
resolves to `packages/audio-engine/docs/adr/003-cue-fields.md`).

### 3. Package context for skills

Skills receive package context two ways, in order:

1. **Explicit:** the user says "create a story in `audio-engine`" or
   the request includes a `package:` argument. The skill writes to
   `<package-path>/<docsDir>/...`.
2. **Inferred fallback:** if the active file being edited lives under a
   declared package path, that package is the default. Otherwise the
   skill defaults to root.

Skills never auto-discover packages by scanning the workspace; they
read the `packages:` list from `doccraft.json` and treat it as
authoritative.

### 4. Root manifest baked into skills

At `doccraft update`, the installer bakes the package list into each
skill body via the extension marker mechanism from
[ADR 013](013-extension-framework.md). Skills see something like:

```markdown
## Known package roots

- audio-engine — packages/audio-engine/docs/
- ui-shell — packages/ui-shell/docs/

Resolve `pkg/STR-NNNN` and `pkg/NNN-...md` references against these
roots. The root `docs/` (no namespace) is always available.
```

This re-uses the same bake step as extensions — no new mechanism.

### 5. Root `docs/` — cross-cutting stories, not an aggregate

The root `docs/` remains a first-class planning surface. Its
`stories/`, `adr/`, `queue.md`, and `backlog.md` hold cross-cutting
work (infra, repo policy, cross-package coordination). Root `queue.md`
lists only root-scoped stories — not an aggregate of every package.

`doccraft-queue-audit` gains an aggregate-view mode (printed to terminal
or written to a flat file on demand) that flattens unblocked stories
across all scopes for "what can I work on next, anywhere." It is
**not** a committed file by default.

### 6. Epics — left to an extension

Epics (stories that group child stories across packages) are not core.
They live as a doccraft extension per ADR 013 — adds an
`epic:` frontmatter field and a `children:` list, scaffolds
`docs/epics/` at root. Lands in audio-stage's extension set, not in
doccraft itself.

## Consequences

- **+** Monorepos can plan per-package without losing root-level
  cross-cutting work or cross-package dependencies.
- **+** Explicit opt-in keeps doccraft out of every package that
  happens to have a `docs/` for unrelated reasons (e.g. `eval`).
- **+** Namespaced ids are self-describing — reading a `depends_on`
  list immediately tells you which scope each reference is in.
- **+** Re-uses ADR 013's extension marker mechanism for the baked
  package list; no second injection mechanism.
- **−** Breaking change: existing root-only ids stay valid (no
  namespace = root), but tooling that assumed flat ids in
  `depends_on` may need updates. Only audio-stage is affected.
- **−** `doccraft-queue-audit` complexity grows: cross-scope edges in
  the dependency graph, per-scope queue reconciliation, optional
  aggregate view. Mostly mechanical, but a meaningful skill rewrite.
- **−** Scaffolding a new package's `docs/` requires `doccraft update`
  to detect the new entry in `packages:` and seed the structure. Same
  never-overwrite semantics apply, so this is safe to re-run.

## Alternatives considered

- **Auto-discover via pnpm workspace globs** — rejected; `eval` has
  `docs/` but isn't a planning package. Auto-discovery has no way to
  tell the difference.
- **Flat globally-unique ids** (`STR-9000` lives under whichever
  package owns it) — rejected; readability in `depends_on` lists
  suffers, and package renames break id ownership opaquely.
- **One `docs/` at root with `package:` frontmatter on each story** —
  rejected; defeats the entire motivation (root listing hundreds of
  stories was the original problem).
- **Root `docs/` becomes a pure index** — rejected; cross-cutting
  work needs a real home, and "everything is in a package" is wrong
  for repo-wide infra/policy.
- **Epics as a core concept** — rejected; epics are content-shaped,
  not infrastructure-shaped. Extensions are the right surface (and
  ADR 013 ships the mechanism).
