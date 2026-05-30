---
name: doccraft-adr
description: >-
  Author or update architecture decision records (a.k.a. ADRs, design
  decisions, architecture decision log entries) under {{DOCS_DIR}}/adr/ as
  NNN-kebab-case.md with Nygard-style Context, Decision, Consequences, and
  an explicit Status. Use whenever the user is recording a new decision,
  superseding an old one, capturing a rejected option so the team doesn't
  revisit it, or editing anything under {{DOCS_DIR}}/adr/ — even if they call it a
  design note, tech decision, or RFC outcome.
---

# doccraft — architecture decision records (ADRs)

## When to use

- A chat or design exploration reached a **conclusion** worth keeping (yes, no, defer, or "use X instead of Y").
- You need to **supersede** an older ADR without rewriting history.
- A **rejected** option should stay visible so the team does not revisit the same dead end.

Not every brainstorm needs an ADR — only decisions you want **git history and agents** to reuse.

## YAML frontmatter

Use valid YAML between `---` delimiters at the top of the file, or an
inline `**Status:**` line immediately after the title. If the project
sets `adr.require_frontmatter: true` in `doccraft.yaml`, frontmatter is
mandatory — otherwise either form is acceptable, but frontmatter is
preferred for machine-readability.

| Field | Required | Values / notes |
|-------|----------|----------------|
| `adr` | yes | Three-digit zero-padded string matching the filename number (e.g. `"007"`). MUST be unique — verify before writing. |
| `status` | yes | One of the values in `adr.status` config (default: `Proposed` \| `Accepted` \| `Superseded by NNN-slug` \| `Deprecated`). If the user does not specify, default to `Proposed`. |
| `updated` | yes | ISO date `YYYY-MM-DD`. MUST be set on creation and updated on every meaningful edit. |
| `supersedes` | optional | YAML list of ADR filenames this record supersedes (e.g. `[005-old-approach.md]`). Omit or `[]` if none. |
| `superseded_by` | optional | Filename of the ADR that replaced this one. Set to `null` or omit when active. |

> Do not invent new values for `status` without first adding them to the
> `adr.status` list in `doccraft.yaml` — that is the single source of
> truth. One-off nuance belongs in the body, not as a new enum value.

<!-- doccraft:inject point=adr.frontmatter.fields -->
<!-- /doccraft:inject -->

## File location and naming

- Path: **`{{DOCS_DIR}}/adr/NNN-short-slug.md`** — three-digit zero-padded index, kebab-case slug (e.g. `001-managed-postgres.md`).
- **`{{DOCS_DIR}}/adr/README.md`** is the index — do NOT treat it as an ADR; no `NNN-` prefix, no required Nygard sections.
- Pick the **next** unused number. NEVER renumber published ADRs; add a new ADR that **supersedes** instead.

## Document structure (Nygard-style)

Use markdown with a top-level title, then these sections. MUST use these
headings for grep-ability. Order MUST follow the sequence below:

### Context

Problem, forces, constraints, what question was being answered.

### Decision

Clear statement of what was chosen (including "we will not implement X").

### Consequences

Positive and negative effects, follow-up work, coupling introduced.

### Alternatives considered

Optional but MUST include when multiple options existed. Brief bullets:
what was considered and why it was not chosen.

Do not add other top-level sections. Put additional context in
**Consequences** or inline under the relevant heading.

<!-- doccraft:inject point=adr.body.sections -->
<!-- /doccraft:inject -->

## Status and supersession

Record status near the top (after the title) as an inline
`**Status:**` line, in YAML frontmatter, or both. Every ADR MUST have
a status.

| Status | Meaning |
|--------|---------|
| `Proposed` | Draft; not yet agreed. |
| `Accepted` | This is the active record (including "rejected feature" outcomes). |
| `Superseded by NNN-other-slug` | Replaced; link to the new ADR file by name. |
| `Deprecated` | No longer applies; one line why. |

When superseding:

1. Add new ADR with higher number; **Context** MUST cite the old ADR.
2. Update old ADR's status line to `Superseded by NNN-new-slug`.
3. NEVER delete old ADRs — they are the record of what was considered.

## Linking to stories

- **Accepted ADR → implementation:** add a story under `{{DOCS_DIR}}/stories/` and
  reference the ADR filename in the story's `adr_refs` frontmatter field
  (see `doccraft-story` if installed).
- **Story → ADR:** list ADR filenames in the story's `adr_refs` when the
  story implements or is constrained by a decision.

## Example skeleton

````markdown
---
adr: "008"
status: Accepted
updated: 2026-05-30
supersedes: []
superseded_by: null
---

# ADR 008: Adopt managed Postgres for primary datastore

**Status:** Accepted

## Context

We need durable transactional storage for user and billing data. Running our
own Postgres adds oncall burden that doesn't match current team size.

## Decision

Use a managed Postgres offering (initial target: the cloud provider already
hosting the app). Review annually or when egress costs cross $X/month.

## Consequences

- + Backups, failover, and point-in-time recovery handled by the provider.
- + One less service to include in the oncall rotation.
- - Vendor lock-in on specific extension availability; portability audit
  required before any future migration.

## Alternatives considered

- **Self-hosted on VMs** — lower monthly cost but higher operational load;
  revisit if the team grows past a single platform engineer.
- **Serverless Postgres (e.g. Neon)** — attractive pricing model but
  connection-pooling behaviour didn't fit our long-lived worker pattern.
````

## Rejected decision example

Title can state the outcome:

> `# ADR 009: Do not introduce a separate event bus (for now)`

**Decision:** Keep using direct service-to-service calls. Revisit when a second consumer of any given event emerges, or when queue durability becomes a hard requirement.

This kind of ADR is valuable even though nothing ships from it — the next time someone proposes "let's add Kafka", the record explains why it was deferred and what would change the answer.

### Invalid examples (do not use)

- Renumbering existing ADRs to "fill gaps" — NEVER renumber, always use
  the next available number.
- Status values like `Draft`, `Approved`, `Closed` — use the canonical
  values only (`Proposed`, `Accepted`, `Superseded by …`, `Deprecated`).
- Deleting or overwriting an old ADR instead of superseding it.
- Adding new top-level sections beyond Context, Decision, Consequences,
  and Alternatives considered — put extra detail under an existing heading.

## Pre-write validation

Before writing or updating an ADR file, MUST complete these checks:

1. **Next number** — scan all `{{DOCS_DIR}}/adr/NNN-*.md` files and pick
   the next unused three-digit number. NEVER reuse or renumber existing
   ADRs.
2. **Unique slug** — confirm the kebab-case slug does not collide with an
   existing file. If it does, adjust the slug.
3. **Valid status** — `status` MUST be one of: `Proposed`, `Accepted`,
   `Superseded by NNN-slug`, `Deprecated`. No other values unless
   extended in `doccraft.yaml`.
4. **Supersession consistency** — if the new ADR supersedes an older one,
   verify the old ADR exists and update its status line to
   `Superseded by NNN-new-slug` in the same turn.
5. **Required sections present** — Context, Decision, and Consequences
   MUST all be present. Alternatives considered MUST be included when
   multiple options existed.

## Done condition

The task is complete when:

- The ADR file exists at the correct path (`{{DOCS_DIR}}/adr/NNN-slug.md`)
  with the correct next number.
- Context, Decision, and Consequences sections are all present.
- Status is recorded (frontmatter, inline `**Status:**` line, or both).
- If superseding: the old ADR's status line has been updated in the same
  turn.
- `{{DOCS_DIR}}/adr/README.md` index has been updated with the new entry.

## Configuration

Read `doccraft.yaml` at invocation. The `adr:` section is this
skill's customisation surface; override the defaults in the tables above
with the values found there. If the file is missing or the `adr:`
section is absent, use the defaults as-is.

Relevant keys:

- `docsDir` — root folder for all docs, relative to project root. Default:
  `docs`. ADRs live at `{docsDir}/adr/`.
- `adr.status` — allowed values for the `status:` field. Default:
  `[Proposed, Accepted, Deprecated]` (plus the `Superseded by …` form).
  Extend if your project uses additional states.
- `adr.require_frontmatter` — when `true`, YAML frontmatter is mandatory
  on every ADR. Default: `false` (inline `**Status:**` line is also
  acceptable).
- `adr.number_format` — digit padding for the NNN prefix. Default: `3`
  (zero-padded to three digits).

Adding to a list in `doccraft.yaml` teaches the skill a new valid
value without touching this file (which `doccraft update` regenerates).
That is the intended way to extend vocabulary for a project.

## Package context

<!-- doccraft:packages -->
<!-- /doccraft:packages -->

For monorepo projects, ADRs may live at the project root or under a
declared package's `{{DOCS_DIR}}/adr/` tree (a **Known package roots**
block appears above when packages are declared). For single-root projects
no block appears, every ADR lives at the project-root
`{{DOCS_DIR}}/adr/`, and the namespace rules below do not apply.

When the project declares packages, decide which scope to write to:

- **Explicit `package:` arg.** Honour an explicit package argument — write
  under that package's `{{DOCS_DIR}}/adr/`.
- **Active-file inference.** If the user is editing a file under a
  declared package path, default to that package's docs root.
- **Root default.** Otherwise, write to the project-root
  `{{DOCS_DIR}}/adr/`.

ADR numbering is per-scope: root and each package have independent number
sequences. `audio-engine/003-foo.md` and the root `003-bar.md` are both
valid concurrent ADRs.

References in **Status: Superseded by …** and a story's `adr_refs:` may
use the namespaced form `<slug>/NNN-slug.md`. Unprefixed filenames always
refer to the project-root `{{DOCS_DIR}}/adr/`.

## Conventions

- Prefer **short** ADRs (roughly one screen); split only if appendices are huge.
- Link to roadmap ids (`P2.1`) or story ids when it clarifies scope.
- If your project uses conventional commits, `docs:` scope is fine for
  ADR-only commits (e.g. `docs(adr): add 008 managed postgres`).

## Workflow reminders

- After creating an ADR that drives implementation, create a story under
  `{{DOCS_DIR}}/stories/` with `adr_refs` pointing to this ADR (use
  `doccraft-story` if installed).
- After superseding an ADR, verify no story's `adr_refs` still points
  only to the old ADR — update references to include the new one.
- After creating or superseding, update `{{DOCS_DIR}}/adr/README.md`
  index in the same turn.

<!-- doccraft:inject point=adr.instructions -->
<!-- /doccraft:inject -->
