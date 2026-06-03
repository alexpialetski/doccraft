---
name: doccraft-queue-audit
description: >-
  Reconcile the dependency graph, pick-next queue, and backlog status across
  {{DOCS_DIR}}/stories/, {{DOCS_DIR}}/queue.md, and {{DOCS_DIR}}/backlog.md. Use after adding or
  editing a story (especially one with depends_on), after reshuffling
  priorities, or when the user asks "what can I work on next", "what's
  unblocked", "sanity-check the queue", "check my story dependencies",
  "fix the queue order", or "what parallel work is ready". In Agent mode
  (the tool can write files), apply objective mechanical fixes in the
  same turn and report what changed; in Ask / read-only mode, emit a
  proposal instead. Stop and report — never guess — on directed cycles,
  unknown depends_on ids, duplicate ids, or ambiguous editorial reorders.
---

# doccraft — queue, dependency audit, and parallel waves

## When to use

- After **adding** a story, changing **`depends_on`** / **`id`**, or
  reshuffling priorities and you want a sanity check on `{{DOCS_DIR}}/queue.md`.
- The user asks "what can I work on next", "what's unblocked",
  "sanity-check the queue", or similar pick-next / dependency questions.
- The user asks for **parallel-ready batches** ("what can I run in
  parallel?") — see **Parallel waves** below.
- The user pastes the suggested follow-up block from `doccraft-story`.

Not for: authoring a new story (use `doccraft-story`), recording a
decision (use `doccraft-adr`), proposing artifacts from a chat thread
(use `doccraft-session-wrap`), or closing one specific story end-to-end
(use `doccraft-close` — it does the status/backlog/queue/epic transition,
then defers to this skill's reconcile invariants).

## Configuration

Read `doccraft.yaml` at invocation. Every key below has a default in the
rest of this body so a missing config file is a soft fallback, not an error.

Relevant keys:

- `docsDir` — root folder for all docs. Default: `docs`. Stories, queue,
  and backlog are at `{docsDir}/stories/`, `{docsDir}/queue.md`,
  `{docsDir}/backlog.md`.
- `queue.tables.suggestedOrder`, `queue.tables.platformSpikes` — the
  heading text this skill uses to find the two tables in the queue file.
  Defaults: `Suggested order`, `Platform spikes`. Rename in config if
  the project uses different headings; the skill matches on heading
  text, not row position.
- `story.id.pattern` — regex for valid story ids. Used when listing
  unknown-id errors and when normalising obvious typos.
- `queueAudit.laneFrom` — tag-prefix priority list for the lane
  heuristic in the parallel-waves pass. Default: `[area, slice]`. Set
  to `[slice, area]` for projects that group work primarily by product
  surface. May also include `epic` — when present (and an epics extension
  defines the `epic:` story field), the queue groups by epic, which is the
  primary ordering for milestone/epic projects (ADR 016).
- `story.status` — the project's allowed status values. Whichever of these
  mean "no longer active work" are **terminal** (`done` always, plus any
  the project adds: `done-no-promote`, `abandoned`, `absorbed`). Wherever
  this skill says a story is `done` / shipped, it means **any terminal
  status** — read the vocabulary rather than matching the literal `done`,
  or a story closed as `absorbed` will wrongly look unfinished and never
  satisfy its dependents.
- `queueAudit.scale.maxStoryFiles`, `queueAudit.scale.maxQueueReorderPct`
  — thresholds that trigger stop-and-confirm in Agent mode. Defaults:
  `5`, `50`. See **Containment** below.

## Multi-package scope

<!-- doccraft:packages -->
<!-- /doccraft:packages -->

For monorepo projects (a **Known package roots** block appears above when
packages are declared), this skill operates over multiple docs roots.
For single-root projects the entire skill operates on the project-root
`{{DOCS_DIR}}/`.

When the project declares packages, the default scope is the active
package, determined by (a) an explicit `package:` arg in the user
request; (b) inference from the active file's path under a declared
package root; or (c) the project root if neither applies. The skill reads
`<scope>/{{DOCS_DIR}}/stories/`, `<scope>/{{DOCS_DIR}}/queue.md`, and
`<scope>/{{DOCS_DIR}}/backlog.md` for that scope only.

**Cross-scope `depends_on`.** Story `depends_on` entries of the form
`<slug>/STR-NNNN` reference a story in another package. When checking
whether a prerequisite is satisfied, resolve the target against the
matching package root, read its `status`, and treat `done` as satisfied.
Cross-scope edges MUST NOT trigger reorders in the other package's queue —
flag any that look stale and let the user choose.

**Materialised aggregate (monorepo only).** Per ADR 016, the root
`{{DOCS_DIR}}/queue.md` in a monorepo is a **generated cross-package
aggregate**, not a hand-maintained file. It composes every package root and
the project root into one ordered queue, using `queueAudit.laneFrom` for the
primary grouping (`epic` first → the milestone/epic roadmap; otherwise
`area`/`slice`). Each row carries the scope-prefixed id and a resolvable link
to the story file (ADR 017).

- **Regenerate, don't hand-edit.** When the user asks "what's unblocked
  anywhere", "regenerate the roadmap", reshuffles cross-package priorities,
  or as the reconcile step of `doccraft-close`, rebuild this file from the
  per-scope stories and queues. The file MUST open with a generated-artifact
  marker (e.g. `<!-- generated by doccraft-queue-audit — do not edit by hand;
  edit per-package queues instead -->`) so no one curates it manually. This
  is the single change ADR 016 makes to ADR 014 §5: the aggregate is
  generated rather than forbidden.
- **Per-package queues stay scope-local.** Each package's own
  `{{DOCS_DIR}}/queue.md` is authored/reconciled normally and is the source
  of truth; the root aggregate is derived from them and never the place to
  edit a package's ordering.
- **Single-root projects have no aggregate** — the one `queue.md` is a
  normal authored file, and this paragraph does not apply.

## What this skill reads and writes

**Reads:**
- `{{DOCS_DIR}}/stories/*.md` — YAML frontmatter (`id`, `status`, `impact`,
  `urgency`, `depends_on`, `tags`, `openspec`, `roadmap_ref`, optional
  `openspec_change`).
- `{{DOCS_DIR}}/queue.md` — the *Suggested order* table, plus *Platform spikes*
  when parallel waves are in scope.
- `{{DOCS_DIR}}/backlog.md` — the *Story files* table and the *Status* column.

**Writes (Agent mode only, on objective fixes):**
- `{{DOCS_DIR}}/queue.md` — reorder rows; drop rows for shipped stories.
- `{{DOCS_DIR}}/backlog.md` — update the *Status* column.
- `{{DOCS_DIR}}/stories/*.md` — narrow YAML edits (see Auto-apply rule 4).

## Input

The user may paste a one- to three-line briefing (what changed, optional
scope). If they omit it, infer from the repo: read every file under
`{{DOCS_DIR}}/stories/` (skip `README.md`) and `{{DOCS_DIR}}/queue.md`.

---

## Mode: propose vs apply

Two behaviours, controlled by the environment — not by user enthusiasm:

- **Apply (Agent mode).** The tool can write files. Treat the audit as
  read + fix — apply objective mechanical fixes in the same turn, then
  report what changed. See **Auto-apply** below.
- **Propose (Ask / read-only mode).** The tool cannot write files. Emit a
  diff-style proposal plus the same issues list; NEVER suggest commits.
  The user copies anything they want applied into a follow-up turn.

If the environment is Ask mode, NEVER write files even when the user
asks — emit a proposal they can apply themselves.

## Auto-apply (Agent mode)

Apply in the same turn when the fix is **objective** — a rule-based
reconciliation that any auditor would make the same way:

1. **Stale suggested-order rows.** A story linked from *Suggested order*
   has `status: done` but still appears in the pick-next table: remove
   that row and renumber subsequent rows. Optionally backfill a new
   bottom row from the next obvious pick in the same band (main vs.
   platform spikes).
2. **Backlog status drift.** For a `roadmap_ref` whose story file is
   `status: done`, if the matching **Status** cell in `{{DOCS_DIR}}/backlog.md`
   still reads `planned` or equivalent, update it to the project's
   established "done" phrasing. NEVER mark **done** in the backlog when
   the story is still `todo` or `in_progress`.
3. **Queue order vs `depends_on`.** For each id `Q` in *Suggested
   order*, if some prerequisite `d` is not `done` and does not appear
   **above** `Q`: reorder rows minimally until the rule holds, or move
   `Q` below every unfinished `d`. MUST prefer moving blocked work **down**
   over reshuffling the whole table.
4. **Flat urgency/impact inversions — narrow scope.** Only when a story
   with `urgency: later` sits above a story with `urgency: now` in the
   same band and no `depends_on` justifies the order: update `urgency`
   on the **lower-urgency** story (users tend to understate, not
   overstate). If the inversion is not flat — if there is any
   ambiguity — list it under **Remaining proposals** instead of
   editing.

### Containment

- **Scale threshold.** If the audit would touch more than **5 story
  files** or reorder more than **half** the *Suggested order* rows,
  MUST stop and report the full plan first, then wait for user
  confirmation. Large changes MUST be a human decision.
- **Working-tree awareness.** If the user has uncommitted changes in
  `{{DOCS_DIR}}/queue.md`, `{{DOCS_DIR}}/backlog.md`, or any story file you would
  touch, MUST report the planned changes first and let the user decide.
  NEVER overwrite in-progress work.
- **Commits.** NEVER create commits unless the user asks. Describe
  what changed so they can commit in their preferred grouping. When
  the user does ask to commit, MUST prefer **one commit per file class**
  (queue, backlog, stories) over one mega-commit — easier to review
  and revert. If the project uses conventional commits, `docs(queue):`
  / `docs(backlog):` / `docs(stories):` scopes are natural.

## Stop and report (no edit)

NEVER guess through these — list them clearly and let the user decide:

- **`depends_on` references an unknown id.** List the offending story
  and the dangling id. Fix only obvious typos that restore a known id
  (e.g. `P0-3` → `P0.3`) and say you did.
- **Directed cycle.** List the cycle (`A → B → A`). NEVER delete edges
  to break it — the user MUST choose which edge is wrong.
- **Duplicate `id`.** Two stories claim the same `id`. Flag; NEVER
  rename either.
- **Ambiguous editorial reorder.** Multiple valid orderings satisfy
  the constraints. Summarise the options (e.g. "put P0.2 before P0.5
  because impact:H, or after because urgency:soon"); NEVER pick.
- **Ambiguous scope (monorepo).** No explicit `package:` arg and the
  user's briefing references stories across multiple package roots.
  Ask which scope to audit before proceeding.

---

## Fields consulted

See `doccraft-story` for the full frontmatter contract. For the audit,
the fields that matter are:

- `id` — node id in the graph; MUST be unique across stories.
- `depends_on` — directed edges. Each entry MUST match another story's
  `id` or an explicit backlog row; unknown ids are errors.
- `status` — **terminal** nodes (any value in `story.status` that means
  closed: `done`, and project additions like `done-no-promote`, `absorbed`,
  `abandoned`) satisfy prerequisites; non-terminal nodes (`todo` /
  `in_progress`) remain scheduling candidates. Match against the configured
  vocabulary, not the literal string `done`.
- `impact` / `urgency` — tie-breakers once dependency constraints are
  satisfied.
- `roadmap_ref` — ties the story to its `{{DOCS_DIR}}/backlog.md` row for the
  backlog-drift check.

<!-- doccraft:inject point=queue.artifact-types -->
<!-- /doccraft:inject -->

## Graph checks

1. **Build directed edges.** For each story `S` and each `d` in
   `depends_on`, add edge `d → S` ("d is a prerequisite of S";
   complete d before scheduling S).
2. **Unknown id.** `depends_on` references an id with no story and no
   clear backlog row: list as an error.
3. **Cycles.** If the `d → S` graph has a directed cycle, list it.
4. **Open subgraph.** Among stories with `status ≠ done`, the
   **sources** (no unfinished prerequisites) are natural "start next"
   candidates.

## Queue checks

Precedence: when story `urgency` and `depends_on` disagree,
**unfinished prerequisites win** unless the queue row explicitly
documents accepted debt in its Notes column.

1. Parse the *Suggested order* table in `{{DOCS_DIR}}/queue.md`. Story links
   and id labels appear in the first column.
2. For each queued row with id `Q`, every `d` in `depends_on` MUST
   either be `done` or appear **above** `Q` (or be explicitly
   accepted as parallel work — call that out).
3. Flag any row whose story is `done` but still listed.

## Output format

MUST use these five sections in this order:

1. **Summary.** Graph health (ok / issues) and whether auto-apply ran.
2. **Issues.** Unknown ids, cycles, duplicate ids, queue-order
   violations that remain after fixes.
3. **Changes applied.** Bullet list — which files, what moved (row
   numbers / backlog rows / frontmatter fields). If nothing changed,
   say **None**.
4. **Remaining proposals.** Subjective reorders, new rows, or
   `depends_on` edges inferred from story bodies but not in YAML —
   list here when they are not unambiguous enough for auto-apply.
5. **Exit.** If the graph and queue are clean and the backlog matches
   shipped stories, say so in one line.

### Example output

```
**Summary:** Graph clean (6 stories, 4 edges, 0 cycles). Auto-apply ran.

**Issues:** None.

**Changes applied:**
- `docs/queue.md`: removed row 3 (P0.3, status: done); renumbered rows 4–6 → 3–5.
- `docs/queue.md`: moved P2.1 below P1.4 (unfinished prerequisite P1.4).
- `docs/backlog.md`: P0.3 Status → "shipped (v0.4.0)".

**Remaining proposals:**
- P2.5 and P2.6 have equal urgency:soon / impact:M and no dependency edge — consider which to prioritise.

**Exit:** Queue and backlog are now consistent with the dependency graph.
```

---

## Queue ordering rules

When reordering or reviewing an auto-apply, these are the rules this
skill enforces:

1. **Read frontmatter.** For each candidate story, read `impact`,
   `urgency`, `depends_on`. Read story bodies for chains not yet in
   YAML and add `depends_on` when a chain is stable.
2. **Order.** Higher `urgency` and `impact` move up, but `depends_on`
   overrides: prerequisites MUST be `done` or appear above this story.
   If `urgency` and `depends_on` disagree, unfinished prerequisites
   win unless debt is documented.
3. **Keep stories honest.** If the table order implies new urgency on
   a story, MUST update the story YAML in the same change — otherwise
   the table and frontmatter drift apart and the next audit will thrash.
4. **Backlog.** When a row ships or is dropped, MUST update the **Status**
   column for that id in `{{DOCS_DIR}}/backlog.md`. New queued items need a
   story file and a row in the backlog's *Story files* table.
5. **Planned-tier coverage.** Every `planned` row in
   `{{DOCS_DIR}}/backlog.md` MUST have a matching file under
   `{{DOCS_DIR}}/stories/` and an entry in the *Story files* table.
   Reconcile periodically.

---

## Parallel waves (optional pass)

Run this only when the user explicitly asks for parallel-ready batches
("what can I run in parallel", "parallel waves", "what's unblocked").
NEVER run as part of every audit — this is a separate pass.

**Preconditions.** Run the graph / queue checks first and surface any
errors before proposing waves. NEVER propose waves on top of a broken
graph.

**Queue parsing.**
- Extract story `id` from the link text (e.g. `[P4.7]`), not the
  filename.
- Preserve row order within each table; lower position = higher
  priority in the main table.
- Default scope: only stories whose `id` appears in the main
  *Suggested order* table.
- Include *Platform spikes* only when the user asks. "Spikes only"
  restricts candidates to that table.

**Readiness.**
- A prerequisite `d` is satisfied when the story with `id: d` has
  `status: done`. If `d` does not match any story file, treat as
  blocked and list under Problems — NEVER assume done.
- A story is **ready** when `status` is `todo` or `in_progress`,
  every prerequisite is satisfied, and its `id` is in the active
  scope.

**Batching rules.**
- **Intra-batch dependency rule.** No two stories in the same batch
  may share a `depends_on` edge (mutual or one-way).
- **Lane heuristic.** Assign each story a lane from `queueAudit.laneFrom`
  in priority order: for `epic`, use the story's `epic:` field; for `area`
  / `slice`, the first matching `tags` prefix; else `lane: misc`. MUST
  prefer batches where each lane appears at most once — reduces merge
  conflicts. If that drops too many ready items, note "merge risk:
  duplicate lane …" and offer a smaller batch or a second wave.
- **Wave ordering.** Sort ready candidates by (1) main-table row
  order, then (2) `impact` H > M > L, then (3) `urgency` now > soon
  > later.
- **Token discipline.** Default proposal focuses on the top 3–6
  ready items unless the user asks for a full scan.

**OpenSpec gate.** If the project uses OpenSpec, stories carry
`openspec: not-needed | recommended | required`:

- `required` — flag prominently. User MUST complete their OpenSpec
  propose flow before heavy implementation. Link `openspec_change`
  when set.
- `recommended` — one line: "OpenSpec recommended if scope is fuzzy."
- `not-needed` — no mention needed.

**Proposal output.** For each candidate story, emit a compact row:
- `id`, `title`, `status`, `lane` (area/slice), `openspec`
- Prerequisites — list `depends_on` with target status
- Link — `{{DOCS_DIR}}/stories/<file>.md`
- **Batch id** (Wave 1, Wave 2, …)

End with a short **Problems** list when any id is missing, cyclic, or
blocked.

---

<!-- doccraft:inject point=queue.instructions -->
<!-- /doccraft:inject -->

## Pre-apply validation

Before applying any change in Agent mode, MUST complete these checks:

1. **All story files read** — scan all `{{DOCS_DIR}}/stories/*.md` frontmatter
   (skip `README.md`) and build the full dependency graph before making
   any edit. NEVER apply partial fixes from an incomplete graph.
2. **No directed cycles** — if the graph contains a cycle, stop and
   report. NEVER break cycles by removing edges.
3. **No unknown ids** — every `depends_on` entry MUST resolve to an
   existing story `id` or backlog row. Fix only obvious typos; flag the
   rest.
4. **No duplicate ids** — every `id` MUST be unique. If duplicates exist,
   stop and report. NEVER rename either.
5. **Scale threshold** — if the planned changes exceed the containment
   limits (>5 story files or >50% of queue rows), stop and present the
   full plan. MUST wait for user confirmation before proceeding.
6. **Working-tree clean** — if uncommitted changes exist in any file you
   would touch, report the plan and let the user decide. NEVER overwrite.

## Invalid examples (do not use)

- Deleting a `depends_on` edge to break a cycle — NEVER; the user MUST
  choose which edge is wrong.
- Renaming a story `id` to resolve a duplicate — NEVER; flag both and
  let the user decide.
- Marking a story as `done` in the backlog when its story file is still
  `todo` or `in_progress` — NEVER; backlog status MUST follow the story
  file, not lead it.
- Picking one ordering over another when multiple valid orderings exist —
  NEVER; list the options and let the user choose.
- Running parallel-waves analysis on a graph with unresolved errors —
  NEVER; fix or report graph issues first.
- Writing files in Ask / read-only mode — NEVER; emit a proposal only.
- Creating commits without the user explicitly asking — NEVER.

## Done condition

The task is complete when:

- Every story file under `{{DOCS_DIR}}/stories/` has been read and its
  frontmatter parsed into the dependency graph.
- All graph checks (unknown ids, cycles, duplicates) have been run and
  either resolved (auto-apply) or reported (stop and report).
- All queue checks (stale rows, ordering violations, backlog drift)
  have been run and either resolved or reported.
- The output follows the five-section format (Summary, Issues, Changes
  applied, Remaining proposals, Exit).
- If parallel waves were requested: the wave proposal is appended after
  the main audit output.
- No file has been written in Ask / read-only mode.

## Optional follow-up template

Use when something cannot be auto-fixed (cycles, ambiguous priority)
or when the user wants to re-run with narrower scope:

```text
Invoke doccraft-queue-audit.

[Context, e.g. "Break cycle P3.2 ↔ P3.4 by removing depends_on X
from story Y."]
[Optional: "Re-check queue only." | "Parallel waves only."]
```

## References

- `{{DOCS_DIR}}/queue.md` — pick-next tables.
- `{{DOCS_DIR}}/backlog.md` — full P-tier tables and Status column.
- `doccraft-story` — field contract for story frontmatter.

> Project-specific vocabulary (tiers, area/slice tags, queue-table
> headings, scale thresholds) lives in `doccraft.yaml` — the
> **Configuration** section above lists the keys this skill reads. The
> tables in this body are defaults used when no config is present.
