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
decision (use `doccraft-adr`), or proposing artifacts from a chat thread
(use `doccraft-session-wrap`).

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
  your project uses different headings; the skill matches on heading
  text, not row position.
- `story.id.pattern` — regex for valid story ids. Used when listing
  unknown-id errors and when normalising obvious typos.
- `queueAudit.laneFrom` — tag-prefix priority list for the lane
  heuristic in the parallel-waves pass. Default: `[area, slice]`. Set
  to `[slice, area]` for projects that group work primarily by product
  surface.
- `queueAudit.scale.maxStoryFiles`, `queueAudit.scale.maxQueueReorderPct`
  — thresholds that trigger stop-and-confirm in Agent mode. Defaults:
  `5`, `50`. See **Containment** below.

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
  diff-style proposal plus the same issues list; do not suggest commits.
  The user copies anything they want applied into a follow-up turn.

If the environment is Ask mode, do not write files even when the user
asks you to — emit a proposal they can apply themselves.

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
   established "done" phrasing. Do not mark **done** in the backlog when
   the story is still `todo` or `in_progress`.
3. **Queue order vs `depends_on`.** For each id `Q` in *Suggested
   order*, if some prerequisite `d` is not `done` and does not appear
   **above** `Q`: reorder rows minimally until the rule holds, or move
   `Q` below every unfinished `d`. Prefer moving blocked work **down**
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
  stop and report the full plan first, then wait for the user to
  confirm. Large changes should be a human decision.
- **Working-tree awareness.** If the user has uncommitted changes in
  `{{DOCS_DIR}}/queue.md`, `{{DOCS_DIR}}/backlog.md`, or any story file you would
  touch, report the planned changes first and let the user decide.
  Do not overwrite in-progress work.
- **Commits.** Do not create commits unless the user asks. Describe
  what changed so they can commit in their preferred grouping. When
  the user does ask to commit, prefer **one commit per file class**
  (queue, backlog, stories) over one mega-commit — easier to review
  and revert. If the project uses conventional commits, `docs(queue):`
  / `docs(backlog):` / `docs(stories):` scopes are natural.

## Stop and report (no edit)

Do not guess through these — list them clearly and let the user decide:

- **`depends_on` references an unknown id.** List the offending story
  and the dangling id. Fix only obvious typos that restore a known id
  (e.g. `P0-3` → `P0.3`) and say you did.
- **Directed cycle.** List the cycle (`A → B → A`). Do not delete edges
  to break it — the user must choose which edge is wrong.
- **Duplicate `id`.** Two stories claim the same `id`. Flag; do not
  rename either.
- **Ambiguous editorial reorder.** Multiple valid orderings satisfy
  the constraints. Summarise the options (e.g. "put P0.2 before P0.5
  because impact:H, or after because urgency:soon"); do not pick.

---

## Fields consulted

See `doccraft-story` for the full frontmatter contract. For the audit,
the fields that matter are:

- `id` — node id in the graph; must be unique across stories.
- `depends_on` — directed edges. Each entry must match another story's
  `id` or an explicit backlog row; unknown ids are errors.
- `status` — `done` nodes satisfy prerequisites; `todo` / `in_progress`
  nodes remain scheduling candidates.
- `impact` / `urgency` — tie-breakers once dependency constraints are
  satisfied.
- `roadmap_ref` — ties the story to its `{{DOCS_DIR}}/backlog.md` row for the
  backlog-drift check.

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
2. For each queued row with id `Q`, every `d` in `depends_on` must
   either be `done` or appear **above** `Q` (or be explicitly
   accepted as parallel work — call that out).
3. Flag any row whose story is `done` but still listed.

## Output format

1. **Summary.** Graph health (ok / issues) and whether auto-apply ran.
2. **Issues.** Unknown ids, cycles, duplicate ids, queue-order
   violations that remain after fixes.
3. **Changes applied.** Bullet list — which files, what moved (row
   numbers / backlog rows / frontmatter fields). If nothing changed,
   say **None**.
4. **Remaining proposals.** Subjective reorders, new rows, or
   `depends_on` edges inferred from story bodies but not in YAML —
   leave here when they are not unambiguous enough for auto-apply.
5. **Exit.** If the graph and queue are clean and the backlog matches
   shipped stories, say so in one line.

---

## How to think about the queue

When reordering by hand or reviewing an auto-apply, keep these rules
in mind — they are the implicit contract the skill enforces:

1. **Read frontmatter.** For each candidate story, read `impact`,
   `urgency`, `depends_on`. Read story bodies for chains not yet in
   YAML and add `depends_on` when a chain is stable.
2. **Order.** Higher `urgency` and `impact` usually move up, but
   `depends_on` can override: prerequisites should be `done` or appear
   above this story. If `urgency` and `depends_on` disagree,
   unfinished prerequisites win unless debt is documented.
3. **Keep stories honest.** If the table order implies new urgency on
   a story, update the story YAML in the same change — otherwise the
   table and frontmatter drift apart and the next audit will thrash.
4. **Backlog.** When a row ships or is dropped, update the **Status**
   column for that id in `{{DOCS_DIR}}/backlog.md`. New queued items need a
   story file and a row in the backlog's *Story files* table.
5. **Planned-tier coverage.** Every `planned` row in
   `{{DOCS_DIR}}/backlog.md` should have a matching file under
   `{{DOCS_DIR}}/stories/` and an entry in the *Story files* table.
   Reconcile periodically.

---

## Parallel waves (optional pass)

Run this only when the user explicitly asks for parallel-ready batches
("what can I run in parallel", "parallel waves", "what's unblocked").
It does not run as part of every audit — it is a second pass.

**Preconditions.** Run the graph / queue checks first and surface any
errors before proposing waves. Do not propose waves on top of a broken
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
  blocked and list under Problems — do not assume done.
- A story is **ready** when `status` is `todo` or `in_progress`,
  every prerequisite is satisfied, and its `id` is in the active
  scope.

**Batching rules.**
- **Intra-batch dependency rule.** No two stories in the same batch
  may share a `depends_on` edge (mutual or one-way).
- **Lane heuristic.** From `tags`, take the first `area:*`, else
  `slice:*`, else `lane: misc`. Prefer batches where each lane
  appears at most once — reduces merge conflicts. If that drops too
  many ready items, note "merge risk: duplicate lane …" and offer a
  smaller batch or a second wave.
- **Wave ordering.** Sort ready candidates by (1) main-table row
  order, then (2) `impact` H > M > L, then (3) `urgency` now > soon
  > later.
- **Token discipline.** Default proposal focuses on the top 3–6
  ready items unless the user asks for a full scan.

**OpenSpec gate.** If the project uses OpenSpec, stories carry
`openspec: not-needed | recommended | required`:

- `required` — flag prominently. User should complete their OpenSpec
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
{{BUSINESS_INTEGRATION_BLOCK}}
## Optional follow-up template

Use when something cannot be auto-fixed (cycles, ambiguous priority)
or when the user should re-run with narrower scope:

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
