---
name: doccraft-story
description: >-
  Author or update product stories (a.k.a. planning docs, backlog items,
  tickets, specs) as Markdown under docs/stories/ with a YAML frontmatter
  contract (id, status, impact, urgency, depends_on, tags, openspec). Use this
  whenever the user is creating a story, reprioritising work, writing
  acceptance criteria, linking a story to OpenSpec or an ADR, or editing
  anything under docs/stories/ — even if they call it a spec, ticket, backlog
  row, or planning doc.
---

> Managed by **doccraft** — `doccraft update` regenerates this file. Local edits will be overwritten. See `doccraft.json` to override project-specific vocabulary and paths without touching this file.

# doccraft — planning stories

## When to use

- Creating a new story in `docs/stories/`.
- Updating status, acceptance criteria, tags, or `openspec` on an existing story.
- When closing a story: consider updating `docs/queue.md` and the **Status**
  column in `docs/backlog.md`. After **adding** a story or changing
  **`depends_on`**, invoke the `doccraft-queue-audit` skill in the same
  turn to reconcile the queue graph.

## Configuration

Read `doccraft.yaml` at invocation. The `story:` section is this
skill's customisation surface; override the defaults in the tables below
with the values found there. If the file is missing or the `story:`
section is absent, use the defaults below as-is.

Relevant keys:

- `docsDir` — root folder for all docs, relative to project root. Default:
  `docs`. Stories live at `{docsDir}/stories/`.
- `story.areas`, `story.slices`, `story.themes` — tag vocabulary lists
  (replace the default `area:` / `slice:` / `theme:` values).
- `story.id.tiers` — filename tier prefixes like `p0`…`p4`. Empty list
  `[]` means the project does not use tier prefixes.
- `story.id.pattern` — regex accepting valid story `id:` values in
  frontmatter. Use this to validate new stories and to normalise
  `depends_on` typos. Default: `^(P\d+(\.\d+)?|[a-z][a-z0-9-]+)$`.

Adding to a list in `doccraft.yaml` teaches the skill a new valid
value without touching this file (which `doccraft update` regenerates).
That is the intended way to extend vocabulary for a project.

## File location and naming

- Path: **`docs/stories/<slug>.md`** — kebab-case slug.
- **P-tier stories** (aligned with a prioritised backlog): use
  `p{tier}-<topic>.md` where tier is `p0`…`p4`. The ordinal (e.g. `P0.3`)
  lives in YAML `id`, not in the filename. Examples:
  `p0-payment-retry-flow.md`, `p2-observability-rollout.md`.
- **Non-tier work**: stable prefix + slug, e.g. `opt-2a-workflow-rename.md`.
- One story per file. **No epic folders** — use prefixed `tags` for grouping.

## YAML frontmatter (required fields)

Use valid YAML between `---` delimiters at the top of the file.

| Field | Required | Values / notes |
|-------|----------|----------------|
| `id` | yes | Stable, unique id across stories. `P0.3` when aligned to `docs/backlog.md`, or a slug like `story-2026-001`. |
| `title` | yes | Short human-readable title. |
| `status` | yes | `todo` \| `in_progress` \| `done` — **manual** updates only. |
| `impact` | yes | `H` (high) \| `M` \| `L` — product or engineering leverage. |
| `urgency` | yes | `now` \| `soon` \| `later` — time sensitivity or deadline pressure. |
| `tags` | yes | YAML list of **prefixed** strings (`area:`, `slice:`, `theme:`) from the vocabulary below. If nothing fits and the label will recur, extend this skill in the same change (see **Extending the vocabulary**). |
| `openspec` | yes | `not-needed` \| `recommended` \| `required` — whether OpenSpec-style spec work fits before coding. |
| `updated` | recommended | ISO date `YYYY-MM-DD` when the story last changed meaningfully. |
| `roadmap_ref` | optional | e.g. `P1.7` — pointer to the backlog row when applicable. |
| `depends_on` | optional | YAML list of **story `id` values** that must be satisfied **before** this story is picked up (prerequisites). Omit or `[]` if none. Each entry must match another story's `id` or a backlog id you intentionally treat as external — prefer real story ids so the queue-audit graph stays honest. |
| `adr_refs` | optional | List of ADR filenames this story implements or contradicts (e.g. `001-foo.md`). |
| `openspec_change` | optional | Path or name of the OpenSpec change folder when one exists. |

> Do not invent new values for `status`, `impact`, `urgency`, or `openspec`
> without updating this skill in the same change — the enum tables above are
> the single source of truth. One-off nuance belongs in the body, not as a
> new enum value.

### `openspec` guidance

- **`not-needed`** — small change, obvious scope, few files.
- **`recommended`** — multi-module, schema/graph shifts, ambiguous scope, or
  high regression risk; add a sentence in the body:
  *OpenSpec recommended because: …*
- **`required`** — project policy demands formal spec-before-code for this
  class of change.

Do not create an `openspec/` tree unless the repository has adopted OpenSpec;
the field is preparatory.

## Tag vocabulary

Every tag uses a **prefix** so subsystem vs product slice vs cross-cutting
theme is unambiguous. Use **lowercase** after the colon (e.g. `area:api`).

| Prefix | Meaning | Examples |
|--------|---------|----------|
| `area:` | Subsystem / code area. Align with your project's commit scopes where you already have them. | `area:api`, `area:cli`, `area:auth`, `area:data`, `area:infra`, `area:schemas` |
| `slice:` | Product surface that spans multiple areas. | `slice:ui`, `slice:admin`, `slice:onboarding` |
| `theme:` | Cross-cutting quality or kind of work. | `theme:observability`, `theme:performance`, `theme:security`, `theme:docs`, `theme:testing` |

A story may list several tags, e.g. `area:api`, `area:data`, `theme:performance`.

### Extending the vocabulary

- If **no** existing `area:`, `slice:`, or `theme:` value fits, and the
  label will **recur**, add it to the matching list in `doccraft.yaml`
  (keys `story.areas` / `story.slices` / `story.themes`). Commit the
  config edit together with the first story that uses the new value.
- **One-off** nuance that will not recur belongs in the body (**Notes**),
  not as a new tag.

Do not edit the tables in this `SKILL.md` directly — `doccraft update`
regenerates this file and would overwrite the edit. `doccraft.yaml`
is the single source of truth for project-specific vocabulary.

### Invalid examples (do not use)

- Bare words: `api`, `ui` — always use a prefix so the kind of label is
  explicit.
- Wrong prefix for the kind of label (e.g. `area:ui` while `slice:ui` is the
  convention) — prefer `slice:` for product surfaces.

## Body template

After frontmatter, use markdown sections such as:

1. **Problem / outcome** — what user or system need this addresses.
2. **Acceptance criteria** — bullet list, testable where possible.
3. **Notes** — links to code (`src/...`), related ADRs, PRs.

## Example

````markdown
---
id: P0.3
title: Payment retry flow with idempotency keys
status: todo
impact: H
urgency: now
tags:
  - area:api
  - area:data
openspec: recommended
updated: 2026-04-18
roadmap_ref: P0.3
depends_on: []
---

## Problem / outcome

Failed third-party charges silently drop transactions; add retries with
idempotency so users can reorder without double-billing.

## Acceptance criteria

- [ ] Retries use persisted idempotency keys.
- [ ] Integration tests cover success, transient-failure, and permanent-failure paths.
- [ ] Runbook updated with the new retry behaviour.

## Notes

OpenSpec recommended because: touches schema + payment service + integration tests.
````

## Workflow reminders

- Move `status` to `in_progress` when you start implementation; `done` when
  shipped or explicitly abandoned (note why in body if abandoned).
- When reprioritising, consider updating `docs/queue.md` in the same commit
  as meaningful story status changes.
- After creating a story or changing `depends_on`, invoke
  `doccraft-queue-audit` in the same turn so the working queue stays
  consistent with the dependency graph.
