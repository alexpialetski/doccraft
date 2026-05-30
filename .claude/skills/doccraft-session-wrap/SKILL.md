---
name: doccraft-session-wrap
description: >-
  After a design, research, business, or prioritisation thread, evaluate
  whether the conversation produced durable insight worth capturing in
  docs/, then propose only the artifacts that are clearly justified (ADR,
  research note, reference doc, business update, story, backlog/queue
  edit). Use when the user says "wrap this session", "propose docs
  artifacts", "what should we capture", "summarize this into docs",
  "end-of-session", or similar close-out phrasing. If nothing warrants
  capture, say so in one sentence and stop. Never write files unless the
  user explicitly asks to create or update them in the same turn — propose
  drafts only.
---

> Managed by **doccraft** — `doccraft update` regenerates this file. Local edits will be overwritten. See `doccraft.json` to override project-specific vocabulary and paths without touching this file.

# doccraft — session wrap (propose docs artifacts)

## When to use

- The user **invokes this skill** or asks to **wrap this session** /
  **propose docs artifacts** / **what should we capture** /
  **summarize this discussion into docs** from the **current conversation**.
- Typical triggers: architecture or product discussion concluded (or
  deferred with rationale), research synthesis, or reprioritisation — **not**
  every casual Q&A.

**Default:** propose artifacts **only if necessary**. Do not invent work to
document.

NEVER write files unless the user explicitly asks to create or update
them in the same turn. Propose drafts only.

## Configuration

Read `doccraft.yaml` at invocation. The `sessionWrap.capture:` block
controls which artifact categories are in scope for this project — skip
rows entirely in the proposals table when their category is disabled.

Relevant keys:

- `docsDir` — root folder for all docs. Default: `docs`. All artifact
  paths below are relative to `{docsDir}/`.
- `sessionWrap.capture.research` — default `true`.
- `sessionWrap.capture.reference` — default `true`.
- `sessionWrap.capture.business` — default `false`. Projects that track
  strategy under `{docsDir}/business/` set this to `true`; most projects
  leave it off.

If `doccraft.yaml` is missing, apply the defaults above. The `ADR`,
`Story`, and `Backlog / queue` categories are always in scope — they
are the load-bearing set.

## Package routing


For monorepo projects (a **Known package roots** block appears above when
packages are declared), artifact proposals route to the package whose
body the conversation referenced most. Default to the project root when
no single package dominates. The paths in the docs map below resolve
relative to the chosen package's `docs/` (or the project-root
`docs/` for single-root projects).

## Docs map (where things go)

Authoritative overview, if the project has one: `docs/README.md`.

| Kind | Path | Use for |
|------|------|--------|
| **ADR** | `docs/adr/NNN-slug.md` | A **decision** to freeze (chosen option, explicit deferral, or rejected approach you do not want re-litigated). See `doccraft-adr` if installed. |
| **Research** | `docs/research/<topic>.md` | **Exploration / comparison / notes** (tools, papers, datasets) without a single "we decided X" — synthesis for humans and future agents. |
| **Reference** | `docs/reference/<topic>.md` | Long-form **engineering** notes (runbooks, eval harnesses, pricing) that are not framed as an ADR. If the project has a `docs/reference/README.md`, add a link there when adding a new file. |
| **Business** | `docs/business/<topic>.md` | **Business strategy** — target audience, business model, competitive landscape, marketing, unit economics, legal, launch sequence. Only propose if the project already tracks business docs under `docs/business/`; prefer updating existing topics over creating new ones. |
| **Story** | `docs/stories/<slug>.md` | **Trackable scope** with acceptance criteria and optional `depends_on`. Follow `doccraft-story` if installed. |
| **Backlog / queue** | `docs/backlog.md`, `docs/queue.md` | P-tier rows, status column, ordered "pick next" — not every chat. If the thread defined new **dependencies**, point the user at `doccraft-queue-audit` (Agent mode applies mechanical fixes). |


## Gate checklist (run mentally before proposing)

Answer each **only from the visible thread** (and optional repo files the user
already opened). If the answer is "no" for all actionable rows, go to **Exit**.

1. **ADR** — Did the thread reach (or explicitly record) an **architecture /
   process / stack** conclusion worth git history? (Includes "we will not do X".)
2. **Research** — Is there **durable synthesis** (comparisons, constraints,
   citations) that is **not** a single sharp decision?
3. **Reference** — Is there **operational or eval** depth better as a living
   doc than an ADR or a story?
4. **Business** — If the project tracks business strategy under
   `docs/business/`: did the thread produce **business insights** (audience,
   pricing, competitive, marketing, legal, economics) that MUST update or
   extend those docs? Prefer updating existing docs over creating new ones.
   Skip this row entirely if the project has no `docs/business/` tree.
5. **Story** — Is there a **bounded deliverable** with testable acceptance
   criteria not already covered by an existing story?
6. **Backlog / queue** — Did priorities or **P-tier status** change in a way
   that belongs in the tables (rare for a pure discussion thread)?

If **none** of the above apply, go to **Exit**.

## Output format

MUST use these sections in this order:

1. **Summary** — One short paragraph: what (if anything) is worth capturing.

2. **Proposals table** (omit rows with no proposal):

   | Artifact | Proposed path | Why (one line) | Follow |
   |----------|---------------|----------------|--------|
   | ADR / Research / Reference / Story / Backlog / Queue | e.g. `docs/adr/004-foo.md` | ... | link to relevant skill or docs overview |

3. **Do not write files** unless the user explicitly asks to create or update
   them in the same turn. Offer drafts only when useful.

4. If proposing an ADR, remind: next `NNN-`, no renumbering; use
   `doccraft-adr`.

5. If proposing a story, remind: use `doccraft-story`; consider updating
   `docs/backlog.md` (status column) and `docs/queue.md` (pick-next order)
   when priorities shift, and invoke `doccraft-queue-audit` in the same
   turn if new `depends_on` edges were introduced.

### Example output

```
**Summary:** This thread established a caching strategy for API responses
and identified a follow-up task for cache invalidation testing.

| Artifact | Proposed path | Why (one line) | Follow |
|----------|---------------|----------------|--------|
| ADR | `docs/adr/012-api-response-caching.md` | Decided on Redis with 5-min TTL over in-memory; worth freezing | `doccraft-adr` |
| Story | `docs/stories/p2-cache-invalidation-tests.md` | Bounded deliverable with clear acceptance criteria from discussion | `doccraft-story` |

- ADR: next number is 012. Use `doccraft-adr` to write.
- Story: use `doccraft-story`. If `depends_on` edges are added, invoke
  `doccraft-queue-audit` in the same turn.
```

## Exit (nothing to capture)

If no row in the proposals table applies, respond with **one or two sentences**
only, e.g. *"No durable decisions or synthesis in this thread; nothing to add
to `docs/`."* — then **stop** (no filler table, no speculative ADRs).

## Pre-execution validation

Before proposing any artifacts, MUST complete these checks:

1. **Thread scan** — review the entire visible conversation thread. NEVER
   propose artifacts from assumptions about what was discussed.
2. **Existing artifacts** — check `docs/adr/`, `docs/stories/`,
   `docs/research/`, and `docs/reference/` for existing files that
   already cover the topic. Prefer updating existing docs over creating
   duplicates.
3. **Config check** — read `doccraft.yaml` to determine which categories
   are enabled. NEVER propose a Research artifact when
   `sessionWrap.capture.research` is `false`, or a Business artifact when
   `sessionWrap.capture.business` is `false`.
4. **ADR numbering** — if proposing an ADR, scan `docs/adr/NNN-*.md`
   to determine the next unused number. MUST include the correct next
   number in the proposal.
5. **Story uniqueness** — if proposing a story, scan
   `docs/stories/*.md` frontmatter to confirm no existing story
   already covers the same scope.

## Invalid examples (do not use)

- Proposing an ADR when the thread only explored options without reaching
  a conclusion — use Research instead, or propose nothing.
- Proposing artifacts for a casual Q&A or debugging session with no
  durable insight — use Exit instead.
- Writing files without the user explicitly asking in the same turn —
  NEVER; propose only.
- Proposing a Business artifact when `docs/business/` does not exist
  and the project has not opted in via config — NEVER.
- Proposing speculative stories for work that was not discussed in the
  thread — NEVER invent work to document.
- Including a filler table with empty rows when nothing warrants capture —
  use the one-sentence Exit instead.
- Proposing a Reference doc when the content is a single sharp decision —
  use an ADR instead.
- Proposing an ADR when the content is a broad comparison without a
  conclusion — use Research instead.

## Done condition

The task is complete when:

- The full conversation thread has been reviewed against the gate
  checklist.
- Either a proposals table has been presented with concrete paths, one-line
  justifications, and follow links for each proposed artifact, or the Exit
  response has been given.
- No files have been written (unless the user explicitly asked to create
  or update them in the same turn).
- If an ADR was proposed, the next available `NNN-` number is included.
- If a story was proposed, a reminder to use `doccraft-story` and
  consider `doccraft-queue-audit` is included.

## Workflow reminders

- After the user approves a proposed ADR, invoke `doccraft-adr` to write
  it — do not write the ADR manually.
- After the user approves a proposed story, invoke `doccraft-story` to
  write it — do not write the story manually.
- If the user asks to create multiple proposed artifacts in one turn,
  invoke each relevant skill in sequence.
- If the proposals table includes both an ADR and a story that references
  it, create the ADR first so the story's `adr_refs` can reference it.
