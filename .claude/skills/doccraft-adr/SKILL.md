---
name: doccraft-adr
description: >-
  Author or update architecture decision records (a.k.a. ADRs, design
  decisions, architecture decision log entries) under docs/adr/ as
  NNN-kebab-case.md with Nygard-style Context, Decision, Consequences, and
  an explicit Status. Use whenever the user is recording a new decision,
  superseding an old one, capturing a rejected option so the team doesn't
  revisit it, or editing anything under docs/adr/ — even if they call it a
  design note, tech decision, or RFC outcome.
---

> Managed by **doccraft** — `doccraft update` regenerates this file. Local edits will be overwritten. See `doccraft.json` to override project-specific vocabulary and paths without touching this file.

# doccraft — architecture decision records (ADRs)

## When to use

- A chat or design exploration reached a **conclusion** worth keeping (yes, no, defer, or "use X instead of Y").
- You need to **supersede** an older ADR without rewriting history.
- A **rejected** option should stay visible so the team does not revisit the same dead end.

Not every brainstorm needs an ADR — only decisions you want **git history and agents** to reuse.

## Configuration

Read `doccraft.yaml` at invocation. If the file is missing, use the
default below.

Relevant keys:

- `docsDir` — root folder for all docs, relative to project root. Default:
  `docs`. ADRs live at `{docsDir}/adr/`.

## File location and naming

- Path: **`docs/adr/NNN-short-slug.md`** — three-digit zero-padded index, kebab-case slug (e.g. `001-managed-postgres.md`).
- **`docs/adr/README.md`** is the index — do not treat it as an ADR; no `NNN-` prefix, no required Nygard sections.
- Pick the **next** unused number. Never renumber published ADRs; add a new ADR that **supersedes** instead.

## Document structure (Nygard-style)

Use markdown with a top-level title, then sections (order flexible but keep these headings for grep-ability):

### Context

Problem, forces, constraints, what question was being answered.

### Decision

Clear statement of what was chosen (including "we will not implement X").

### Consequences

Positive and negative effects, follow-up work, coupling introduced.

### Alternatives considered

Optional but **strongly encouraged** when multiple options existed. Brief bullets: what was considered and why it was not chosen.

## Status and supersession

Near the top (after the title) or in optional YAML frontmatter, record status:

| Status | Meaning |
|--------|---------|
| `Proposed` | Draft; not yet agreed. |
| `Accepted` | This is the active record (including "rejected feature" outcomes). |
| `Superseded by NNN-other-slug` | Replaced; link to the new ADR file by name. |
| `Deprecated` | No longer applies; one line why. |

When superseding:

1. Add new ADR with higher number; **Context** should cite the old ADR.
2. Update old ADR's status line to `Superseded by NNN-new-slug`.
3. Do not delete old ADRs — they're the record of what was considered.

## Optional YAML frontmatter

If you use frontmatter, keep it minimal, for example:

```yaml
---
adr: "007"
status: Accepted
supersedes: []
superseded_by: null
---
```

Plain markdown with a **Status:** line is equally acceptable.

## Linking to stories

- **Accepted ADR → implementation:** add a story under `docs/stories/` and
  reference the ADR filename in the story's `adr_refs` frontmatter field
  (see `doccraft-story` if installed).
- **Story → ADR:** list ADR filenames in the story's `adr_refs` when the
  story implements or is constrained by a decision.

## Example skeleton

````markdown
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

## Conventions

- Prefer **short** ADRs (roughly one screen); split only if appendices are huge.
- Link to roadmap ids (`P2.1`) or story ids when it clarifies scope.
- If your project uses conventional commits, `docs:` scope is fine for
  ADR-only commits (e.g. `docs(adr): add 008 managed postgres`).
