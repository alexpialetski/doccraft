---
adr: "015"
status: Accepted
updated: 2026-06-03
supersedes: []
superseded_by: null
---

# ADR 015: A transactional `doccraft-close` skill

**Status:** Accepted

## Context

Closing a single story is a multi-file transaction with no owner:

1. Flip the story's `status` to a terminal value.
2. Update the matching **Status** cell in `{{DOCS_DIR}}/backlog.md`.
3. Remove the story's row from `{{DOCS_DIR}}/queue.md` and renumber.
4. In projects with the `planning-hierarchy` extension, update the parent
   epic's story table (and possibly its `status`).

No skill performs this end-to-end. `doccraft-queue-audit` is *reactive* —
it detects and repairs drift after the fact (a `done` story still sitting
in the pick-next table). It is not the tool you reach for to *close* a
story; it is the tool that cleans up after a sloppy close.

The downstream cost is the staleness the user reports in audio-stage: a
half-applied close (status flipped, queue row left behind, epic table not
updated) *is* drift, and the larger and more namespaced the repo, the more
steps there are to forget. LLMs are especially prone to stopping after
step 1–2. The fix is a skill that owns the whole transition and leaves the
planning surface consistent in one invocation.

This decision is independent of monorepo and epics — every project closes
stories — but it must compose with both: scope resolution for monorepo
(ADR 014) and the epic-table update for the `planning-hierarchy`
extension (ADR 013).

## Decision

Add a core skill **`doccraft-close`** (authored via `skill-creator` per
the repo convention). It performs a **transition-then-reconcile**:

1. **Resolve the target.** Accept a story id or namespaced id
   (`pkg/STR-NNNN`, ADR 014) or an active file. Locate the story file;
   stop and report if it is ambiguous or missing — never guess.
2. **Transition.** Set the story `status` to the terminal value the user
   names (default `done`; honour the project's `story.status` vocabulary
   from `doccraft.json`, including non-promoting terminals like
   `done-no-promote`, `abandoned`, `absorbed`). Update the backlog row,
   remove the queue row and renumber, following the same mechanical rules
   `doccraft-queue-audit` already encodes.
3. **Epic update (injection point).** If an extension contributes an
   epic-close fragment, run it — mark the story's row in the parent epic
   table, and roll the epic to a terminal status when its last open child
   closes. Absent the extension, this step is a no-op.
4. **Reconcile.** Run the `doccraft-queue-audit` invariants over the
   affected scope so the dependency graph and queue are left consistent
   in the same turn (per the user's "transition + reconcile" choice). In
   monorepo projects this also refreshes the materialised aggregate
   (ADR 016).

The epic-close behaviour is delivered through a new injection point on the
close skill — not hardcoded — so epics stay an extension concern
(ADR 013/014 §6). The point is added to the v1 taxonomy as a minor bump.

## Consequences

- **+** One invocation leaves the planning surface consistent; the
  multi-step dance that produces drift is automated.
- **+** Directly attacks the babysitting complaint: most staleness is
  half-applied closes, and this removes the manual half.
- **+** Composes cleanly — non-monorepo, non-epic projects get the plain
  3-step close; the extra steps light up only when the relevant config
  or extension is present, via the same bake-time conditional pattern.
- **−** A second skill now touches queue/backlog mechanics that
  `doccraft-queue-audit` also owns. The two MUST share one set of
  reconciliation rules; the close skill references the audit invariants
  rather than restating them, to avoid the rules drifting apart.
- **−** Adds an injection point to the public taxonomy (ADR 013) — a
  semver-relevant surface. Acceptable; the list stays small.
- **−** Trigger overlap risk with `doccraft-queue-audit`. Mitigated by a
  sharp description: close = "close/ship/mark-done a specific story";
  audit = "what can I work on next / sanity-check the queue."

## Alternatives considered

- **A mode of `doccraft-queue-audit`** rather than a new skill — rejected.
  It muddies the audit skill's "what's next" trigger and overloads one
  skill with both a reactive (reconcile) and an imperative (close)
  contract. A distinct trigger surface is cleaner.
- **Transition-only, no reconcile** — rejected by the user in favour of
  transition + reconcile, so a close never leaves the graph half-checked.
- **Hardcode the epic-table update in the core skill** — rejected;
  epics are extension-shaped (ADR 013/014 §6). An injection point keeps
  core epic-agnostic.
</content>
</invoke>
