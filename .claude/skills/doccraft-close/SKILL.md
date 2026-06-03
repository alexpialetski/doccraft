---
name: doccraft-close
description: >-
  Close a story end-to-end — flip its status to a terminal value and reconcile
  every downstream artifact in one pass: the backlog Status cell, the
  docs/queue.md row, the parent epic table (when the project uses
  epics), then a queue-audit reconcile. Use whenever the user says "close",
  "mark done", "ship", "finish", "complete", or "resolve" a story / ticket /
  backlog item, or moves work to a terminal state (done, done-no-promote,
  abandoned, absorbed). Reach for this instead of hand-editing the story file
  alone — a half-applied close (status flipped but queue/backlog/epic left
  stale) is exactly the drift this skill exists to prevent. Works for single-root
  and monorepo projects.
---

> Managed by **doccraft** — `doccraft update` regenerates this file. Local edits will be overwritten. See `doccraft.json` to override project-specific vocabulary and paths without touching this file.

# doccraft — close a story (transactional)

## When to use

- The user wants to **close / ship / finish / resolve** a specific story and
  have the planning surface end up consistent — not just the story file.
- Work is moving to any **terminal** state: `done`, or a non-promoting
  terminal like `done-no-promote`, `abandoned`, `absorbed`.
- The user pastes "mark P1.30 done", "close audio-engine/STR-0042", "we
  shipped the retry flow", or similar.

Not for: authoring or re-scoping a story (use `doccraft-story`), a general
"what's unblocked / fix the queue" sweep with no specific story to close
(use `doccraft-queue-audit`), or recording a decision (use `doccraft-adr`).

Closing a story is a multi-file transaction. The story file is only step
one; the backlog row, the queue row, and (with epics) the parent epic table
all describe the same work and drift the moment one is updated without the
others. This skill owns the whole transition so a close never lands halfway.

## Configuration

Read `doccraft.json` at invocation. Every key below has a default in this
body, so a missing config file is a soft fallback, not an error.

- `docsDir` — root folder for all docs. Default: `docs`. Stories, queue, and
  backlog live at `{docsDir}/stories/`, `{docsDir}/queue.md`,
  `{docsDir}/backlog.md`.
- `story.status` — the allowed `status:` values. The **terminal** values are
  whichever of these mean "no longer active work" — `done` always, plus any
  the project adds (`done-no-promote`, `abandoned`, `absorbed`). Read this
  list rather than assuming `done` is the only terminal state; a story closed
  as `absorbed` is just as closed as one marked `done`.
- `queue.tables.suggestedOrder`, `queue.tables.platformSpikes` — heading text
  used to locate the queue tables. Defaults: `Suggested order`, `Platform
  spikes`. Matched on heading text, not row position.

## Multi-package scope


For monorepo projects (a **Known package roots** block appears above when
packages are declared), a story lives under a specific scope — the project
root or a declared package's `docs/`. For single-root projects no
block appears and everything operates on the project-root `docs/`.

Resolve the target's scope before touching anything:

- **Namespaced id.** `pkg/STR-NNNN` names the package directly — operate in
  that package's `docs/`. An unprefixed id is project-root scoped.
- **Explicit `package:` arg.** Honour it.
- **Active-file inference.** If the user is editing a file under a declared
  package path, default to that package.

Close the story in **its own** scope: its story file, its package
`docs/queue.md`, and its package `docs/backlog.md`. Then refresh
the root cross-package aggregate (see step 5) so the closed story stops
showing up there.

## What this skill reads and writes

**Reads:**
- The target story file's frontmatter (`id`, `status`, `epic`, `depends_on`,
  `roadmap_ref`) and the project's `story.status` vocabulary.
- The scope's `docs/queue.md` and `docs/backlog.md`.
- The parent epic file when `epic:` is set and the epics extension is active.

**Writes (Agent mode only):**
- The story file — `status` only (and `updated`).
- `docs/backlog.md` — the matching **Status** cell.
- `docs/queue.md` — remove the closed row, renumber.
- The parent epic file — via the `close.epic-update` injection (see below).

## Mode: propose vs apply

Same contract as `doccraft-queue-audit`, set by the environment, not by user
enthusiasm:

- **Apply (Agent mode).** The tool can write files — perform the transition
  and reconcile in the same turn, then report what changed.
- **Propose (Ask / read-only mode).** The tool cannot write files — emit the
  exact diff you *would* apply (which files, which cells, which rows) and
  stop. NEVER write in Ask mode even if asked; the user applies it themselves.

## The close transaction

Run these in order. If any step cannot be completed unambiguously, stop and
report (see **Stop and report**) rather than leaving a partial close.

1. **Resolve the target.** Locate exactly one story file matching the id /
   namespaced id / active file. If zero or more than one match, stop and ask —
   never guess which story to close.

2. **Pick the terminal status.** Use the status the user named; default to
   `done`. It MUST be one of the project's `story.status` terminal values.
   Set the story's `status` and bump `updated` to today. Do not touch other
   frontmatter.

3. **Backlog Status cell.** In the scope's `docs/backlog.md`, find the
   row for this story (by `roadmap_ref` / id) and set its **Status** cell to
   the project's established "closed" phrasing for that terminal state. NEVER
   mark a backlog row closed when the story file is still `todo` /
   `in_progress` — the backlog follows the story, never leads it.

4. **Queue row.** In the scope's `docs/queue.md`, remove the closed
   story's row from the *Suggested order* table and renumber the rows below
   it. A closed story never stays in the pick-next list.

5. **Epic update (injection).** If the project uses epics, run the
   `close.epic-update` fragment below — mark the story's row in the parent
   epic's table and roll the epic to a terminal status when its last open
   child closes. Absent the extension this is a no-op.


6. **Reconcile.** Run the `doccraft-queue-audit` invariants over the affected
   scope (graph checks, queue-order checks, backlog-drift checks) so closing
   this story did not strand a dependent or leave a stale row elsewhere. In a
   monorepo, also regenerate the root cross-package aggregate so the closed
   story is dropped from it. Do not restate the audit rules here — apply the
   same ones `doccraft-queue-audit` defines, so the two skills can never
   reconcile a queue differently.

## Stop and report (no edit)

NEVER guess through these — report and let the user decide:

- **Ambiguous target.** The id / phrase matches zero or several stories.
- **Unknown terminal status.** The requested status is not a terminal value
  in `story.status`. List the valid terminal values.
- **Dependent would be stranded.** Closing this story leaves a dependent whose
  only path forward was this story and whose other prerequisites are
  unfinished — surface it; the close is still valid, but the user should see
  the downstream impact.
- **Working-tree conflict.** Uncommitted changes exist in a file you would
  write. Report the plan; never overwrite in-progress work.


## Pre-apply validation

Before writing anything in Agent mode, MUST complete these checks:

1. **Single target resolved** — exactly one story file matches; scope is
   determined. If not, stop and ask.
2. **Terminal status valid** — the chosen status is in the project's
   `story.status` terminal set.
3. **Backlog row located** — the story's backlog row is found before editing
   its Status cell; if no row exists, note it rather than inventing one.
4. **Queue row located** — the queue row is found (or confirmed absent) before
   renumbering.
5. **Working-tree clean** — for every file to be written; otherwise report and
   defer to the user.

## Invalid examples (do not use)

- Flipping the story `status` and stopping — leaves the backlog, queue, and
  epic stale. The whole point of this skill is the full transition.
- Marking a backlog row or epic row closed while the story file is still
  `todo` / `in_progress` — status flows story → backlog/epic, never the
  reverse.
- Inventing a terminal status not in `story.status` — extend the vocabulary in
  `doccraft.json` first (via `doccraft-config`).
- Deleting a `depends_on` edge on a dependent to "unblock" it after a close —
  never; surface the stranded dependent and let the user decide.
- Writing files in Ask / read-only mode — emit the diff only.
- Creating a commit unless the user asks.

## Done condition

The task is complete when:

- Exactly one story's `status` is set to the intended terminal value and
  `updated` is bumped.
- The matching `docs/backlog.md` Status cell reflects the closure.
- The story's `docs/queue.md` row is removed and rows renumbered.
- If the project uses epics: the parent epic table reflects the closed story
  (via `close.epic-update`).
- The `doccraft-queue-audit` reconcile has run over the affected scope (and
  the root aggregate refreshed in a monorepo) with no unreported drift.
- Nothing was written in Ask / read-only mode.

## References

- `doccraft-queue-audit` — the reconcile invariants this skill defers to.
- `doccraft-story` — the frontmatter contract and terminal `status` vocab.
- `docs/queue.md`, `docs/backlog.md` — the surfaces reconciled.

> Project-specific vocabulary (terminal `status` values, queue-table headings,
> docs dir) lives in `doccraft.json` — the **Configuration** section lists the
> keys this skill reads. The defaults in this body apply when no config is
> present.
