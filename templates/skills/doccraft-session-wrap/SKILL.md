---
name: doccraft-session-wrap
description: >-
  After a design, research, business, or prioritisation thread, evaluate
  whether the conversation produced durable insight worth capturing in
  {{DOCS_DIR}}/, then propose only the artifacts that are clearly justified (ADR,
  research note, reference doc, business update, story, backlog/queue
  edit). Use when the user says "wrap this session", "propose docs
  artifacts", "what should we capture", "summarize this into docs",
  "end-of-session", or similar close-out phrasing. If nothing warrants
  capture, say so in one sentence and stop. Never write files unless the
  user explicitly asks to create or update them in the same turn — propose
  drafts only.
---

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

## Docs map (where things go)

Authoritative overview, if the project has one: `{{DOCS_DIR}}/README.md`.

| Kind | Path | Use for |
|------|------|--------|
| **ADR** | `{{DOCS_DIR}}/adr/NNN-slug.md` | A **decision** to freeze (chosen option, explicit deferral, or rejected approach you do not want re-litigated). See `doccraft-adr` if installed. |
| **Research** | `{{DOCS_DIR}}/research/<topic>.md` | **Exploration / comparison / notes** (tools, papers, datasets) without a single "we decided X" — synthesis for humans and future agents. |
| **Reference** | `{{DOCS_DIR}}/reference/<topic>.md` | Long-form **engineering** notes (runbooks, eval harnesses, pricing) that are not framed as an ADR. If the project has a `{{DOCS_DIR}}/reference/README.md`, add a link there when adding a new file. |
| **Business** | `{{DOCS_DIR}}/business/<topic>.md` | **Business strategy** — target audience, business model, competitive landscape, marketing, unit economics, legal, launch sequence. Only propose if the project already tracks business docs under `{{DOCS_DIR}}/business/`; prefer updating existing topics over creating new ones. |
| **Story** | `{{DOCS_DIR}}/stories/<slug>.md` | **Trackable scope** with acceptance criteria and optional `depends_on`. Follow `doccraft-story` if installed. |
| **Backlog / queue** | `{{DOCS_DIR}}/backlog.md`, `{{DOCS_DIR}}/queue.md` | P-tier rows, status column, ordered "pick next" — not every chat. If the thread defined new **dependencies**, point the user at `doccraft-queue-audit` (Agent mode applies mechanical fixes). |

## Gate checklist (run mentally before proposing)

Answer each **only from the visible thread** (and optional repo files the user
already opened). If the answer is "no" for all actionable rows → **§ Exit below**.

1. **ADR** — Did the thread reach (or explicitly record) an **architecture /
   process / stack** conclusion worth git history? (Includes "we will not do X".)
2. **Research** — Is there **durable synthesis** (comparisons, constraints,
   citations) that is **not** a single sharp decision?
3. **Reference** — Is there **operational or eval** depth better as a living
   doc than an ADR or a story?
4. **Business** — If the project tracks business strategy under
   `{{DOCS_DIR}}/business/`: did the thread produce **business insights** (audience,
   pricing, competitive, marketing, legal, economics) that should update or
   extend those docs? Prefer updating existing docs over creating new ones.
   Skip this row entirely if the project has no `{{DOCS_DIR}}/business/` tree.
5. **Story** — Is there a **bounded deliverable** with testable acceptance
   criteria not already covered by an existing story?
6. **Backlog / queue** — Did priorities or **P-tier status** change in a way
   that belongs in the tables (rare for a pure discussion thread)?

If **none** of the above apply → go to **§ Exit**.

## Output format

1. **Summary** — One short paragraph: what (if anything) is worth capturing.

2. **Proposals table** (omit rows with no proposal):

   | Artifact | Proposed path | Why (one line) | Follow |
   |----------|---------------|----------------|--------|
   | ADR / Research / Reference / Story / Backlog / Queue | e.g. `{{DOCS_DIR}}/adr/004-foo.md` | … | link to relevant skill or docs overview |

3. **Do not write files** unless the user explicitly asks to create or update
   them in the same turn. Offer drafts only when useful.

4. If proposing an ADR, remind: next `NNN-`, no renumbering; use
   `doccraft-adr`.

5. If proposing a story, remind: use `doccraft-story`; consider updating
   `{{DOCS_DIR}}/backlog.md` (status column) and `{{DOCS_DIR}}/queue.md` (pick-next order)
   when priorities shift, and invoke `doccraft-queue-audit` in the same
   turn if new `depends_on` edges were introduced.

## Exit (nothing to capture)

If no row in the proposals table applies, respond with **one or two sentences**
only, e.g. *"No durable decisions or synthesis in this thread; nothing to add
to `{{DOCS_DIR}}/`."* — then **stop** (no filler table, no speculative ADRs).
