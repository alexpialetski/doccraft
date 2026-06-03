---
adr: "017"
status: Accepted
updated: 2026-06-03
supersedes: []
superseded_by: null
---

# ADR 017: Path-bearing cross-references (refines ADR 014 namespaced ids)

**Status:** Accepted

## Context

[ADR 014](014-monorepo-package-docs.md) chose namespaced **ids**
(`pipeline/P1.30`, `audio-engine/003-cue-fields.md`) for cross-references
in `depends_on`, `adr_refs`, and `epic:` — explicitly over file paths —
for two reasons: readability in dependency lists, and rename-resilience
(the id is stable when a file moves).

In practice that stability has a cost the user feels every session: an id
alone is **not resolvable in one hop**. To open `pipeline/P1.30` an agent
must glob the package's `stories/` directory and match the file — an extra
tool call per reference, multiplied across an epic's story table and every
`depends_on` edge. The same applies to a story's `epic: E3`: the epic
filename carries a slug (`E3-pipeline-hygiene.md`), so resolving `E3` to a
file is a search, not a path lookup. References that aren't cheap to
resolve are also references nobody cheaply verifies — so they drift.

The two goals (stable ids, one-hop resolution) are not in conflict if a
reference carries **both**.

## Decision

Keep the namespaced id as the canonical, rename-stable handle (ADR 014
stands). **Augment** every epic↔story (and story↔story) cross-reference so
it also carries a resolvable path — no search step required:

1. **In tables and prose** (epic story tables, queue rows, a story's epic
   line), a cross-reference is rendered as a **markdown link** whose target
   is the file path and whose text is the namespaced id — e.g.
   `[pipeline/P1.30](../../services/pipeline/docs/stories/p1-...md)`. The
   id stays human-readable; the path is one hop away.
2. **In `epic:` frontmatter**, the value carries the path to the epic file
   (project-root-relative), with the short id recoverable from the
   filename — e.g. `epic: docs/epics/E3-pipeline-hygiene.md`. The skills
   treat the leading `E<n>` of the basename as the id for grouping.
3. **`depends_on` / `adr_refs`** keep the namespaced-id form as canonical
   (they are lists where link syntax is awkward), but the skills, when
   they emit a *human-facing* table or report referencing them, render the
   path-bearing link form.

The rename-resilience ADR 014 valued is preserved where it matters
(`depends_on` ids stay stable); the one-hop resolution is added where it
matters (anything an agent opens while authoring, closing, or auditing).
`doccraft-queue-audit` and `doccraft-close` validate that a path-bearing
reference's path actually resolves, and repair it when the id still
matches a moved file — turning rename-breakage into a mechanical fix
rather than a silent dead link.

## Consequences

- **+** Agents (and humans) open a referenced story/epic in one hop; the
  per-reference search tax disappears.
- **+** Broken paths become detectable and auto-repairable during audit —
  the reference is self-checking.
- **+** No reversal of ADR 014: ids remain canonical; this layers paths
  on top.
- **−** Redundancy (id + path) can drift on a rename. Mitigated by the
  audit/close validation step that re-derives the path from the id and
  repairs mismatches.
- **−** Slightly more verbose frontmatter and tables. Acceptable for the
  resolution win; tables already carried links in `queue.md`.
- **−** A migration is required in audio-stage (the only consumer) to
  rewrite existing id-only refs to the path-bearing form — mechanical,
  suitable for subagents.

## Alternatives considered

- **Replace ids with paths outright** — rejected; loses ADR 014's
  rename-stability and makes `depends_on` lists noisy and brittle.
- **Keep id-only, add a resolver index file** (`id → path` map) — rejected;
  a second artifact to keep in sync, and still an indirection rather than a
  direct hop.
- **Deterministic epic filenames (`E3.md`, no slug)** so `E3` resolves
  without search — rejected; the slug is valuable for humans browsing
  `epics/`, and this only solves epics, not the story side.
</content>
