---
name: doccraft-story
description: >-
  Author or update product stories (a.k.a. planning docs, backlog items,
  tickets, specs) as Markdown under {{DOCS_DIR}}/stories/ with a YAML frontmatter
  contract (id, status, impact, urgency, depends_on, tags, openspec). Use this
  whenever the user is creating a story, reprioritising work, writing
  acceptance criteria, linking a story to OpenSpec or an ADR, or editing
  anything under {{DOCS_DIR}}/stories/ — even if they call it a spec, ticket, backlog
  row, or planning doc.
---

# doccraft — planning stories

## When to use

- Creating a new story in `{{DOCS_DIR}}/stories/`.
- Updating status, acceptance criteria, tags, or `openspec` on an existing story.
- When closing a story: update `{{DOCS_DIR}}/queue.md` and the **Status**
  column in `{{DOCS_DIR}}/backlog.md`. See **Workflow reminders** for
  queue-audit invocation rules.

## YAML frontmatter (required fields)

Use valid YAML between `---` delimiters at the top of the file. Every
field marked **yes** MUST be present — do not omit any. If the user has
not provided enough information to fill a required field, ask — NEVER guess.

| Field | Required | Values / notes |
|-------|----------|----------------|
| `id` | yes | Stable, unique id across all stories. `P0.3` when aligned to `{{DOCS_DIR}}/backlog.md`, or a slug like `story-2026-001`. MUST be unique — verify before writing. |
| `title` | yes | Short human-readable title. |
| `status` | yes | One of the values in `story.status` config (default: `todo` \| `in_progress` \| `done`). **Manual** updates only. |
| `impact` | yes | One of the values in `story.impact` config (default: `H` \| `M` \| `L`). If the user does not specify, ask. |
| `urgency` | yes | One of the values in `story.urgency` config (default: `now` \| `soon` \| `later`). If the user does not specify, ask. |
| `tags` | yes | YAML list of **prefixed** strings (`area:`, `slice:`, `theme:`) from the tag vocabulary below. If nothing fits and the label will recur, extend the vocabulary in `doccraft.yaml` in the same change. |
| `openspec` | yes | MUST be set to one of: `not-needed` \| `recommended` \| `required`. See `openspec` guidance below. |
| `updated` | yes | ISO date `YYYY-MM-DD`. MUST be set on creation and updated on every meaningful edit. |
| `roadmap_ref` | optional | e.g. `P1.7` — pointer to the backlog row when applicable. |
| `depends_on` | optional | YAML list of **story `id` values** that MUST be satisfied **before** this story is picked up (prerequisites). Omit or `[]` if none. Each entry MUST match another story's `id` or a backlog id you intentionally treat as external — prefer real story ids so the queue-audit graph stays honest. |
| `adr_refs` | optional | List of ADR filenames this story implements or contradicts (e.g. `001-foo.md`). |
| `openspec_change` | optional | Path or name of the OpenSpec change folder when one exists. |

> Do not invent new values for `status`, `impact`, or `urgency` without first
> adding them to the matching `story.*` enum in `doccraft.json` — those are
> the single source of truth. For `openspec`, update this skill in the same
> change. One-off nuance belongs in the body, not as a new enum value.

<!-- doccraft:inject point=story.frontmatter.fields -->
<!-- /doccraft:inject -->

### `openspec` guidance

- **`not-needed`** — small change, obvious scope, few files.
- **`recommended`** — multi-module, schema/graph shifts, ambiguous scope, or
  high regression risk; add a sentence in the body:
  *OpenSpec recommended because: …*
- **`required`** — project policy demands formal spec-before-code for this
  class of change.

Do not create an `openspec/` tree unless the repository has adopted OpenSpec;
the field is preparatory.

## File location and naming

- Path: **`{{DOCS_DIR}}/stories/<slug>.md`** — kebab-case slug.
- **P-tier stories** (aligned with a prioritised backlog): use
  `p{tier}-<topic>.md` where tier is `p0`…`p4`. The ordinal (e.g. `P0.3`)
  lives in YAML `id`, not in the filename. Examples:
  `p0-payment-retry-flow.md`, `p2-observability-rollout.md`.
- **Non-tier work**: stable prefix + slug, e.g. `opt-2a-workflow-rename.md`.
- One story per file. **No epic folders** — use prefixed `tags` for grouping.

## Body template

After frontmatter, use these markdown sections in this order:

1. **Problem / outcome** *(required)* — what user or system need this addresses.
2. **Acceptance criteria** *(required)* — bullet list, testable where possible.
3. **Notes** *(optional)* — links to code (`src/...`), related ADRs, PRs.

Do not add other top-level sections. Put additional context in **Notes**.

<!-- doccraft:inject point=story.body.sections -->
<!-- /doccraft:inject -->

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
adr_refs:
  - 003-payment-gateway-choice.md
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

## Tag vocabulary

Every tag MUST use a **prefix** so subsystem vs product slice vs cross-cutting
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

## Pre-write validation

Before writing or updating a story file, MUST complete these checks:

1. **Unique `id`** — scan all `{{DOCS_DIR}}/stories/*.md` frontmatter and
   confirm the `id` value does not already exist. If it does, stop and ask
   the user for a different id.
2. **Valid `depends_on`** — every entry in `depends_on` MUST match an
   existing story's `id` value. If a reference is not found, stop and ask
   the user to clarify.
3. **Valid tags** — every tag MUST use a recognised prefix (`area:`,
   `slice:`, `theme:`). Bare words are NEVER acceptable.
4. **Valid enums** — `status`, `impact`, `urgency`, and `openspec` values
   MUST match the allowed values (from `doccraft.yaml` or the defaults in
   the frontmatter table above).
5. **Required fields present** — all fields marked "yes" in the frontmatter
   table MUST be present. If the user has not provided enough information
   to fill `impact`, `urgency`, or `openspec`, ask — do not guess.

## Done condition

The task is complete when:

- The story file exists at the correct path (`{{DOCS_DIR}}/stories/<slug>.md`).
- Frontmatter contains all required fields with valid values.
- Body contains at minimum **Problem / outcome** and **Acceptance criteria**.
- If `depends_on` was added or changed, `doccraft-queue-audit` has been
  invoked in the same turn.
- If the story was closed (`status: done`), `{{DOCS_DIR}}/queue.md` and
  `{{DOCS_DIR}}/backlog.md` have been updated.

## Configuration

Read `doccraft.yaml` at invocation. The `story:` section is this
skill's customisation surface; override the defaults in the tables above
with the values found there. If the file is missing or the `story:`
section is absent, use the defaults as-is.

Relevant keys:

- `docsDir` — root folder for all docs, relative to project root. Default:
  `docs`. Stories live at `{docsDir}/stories/`.
- `story.areas`, `story.slices`, `story.themes` — tag vocabulary lists
  (replace the default `area:` / `slice:` / `theme:` values).
- `story.status` — allowed values for the `status:` field. Default:
  `[todo, in_progress, done]`. Extend if your project uses additional
  states (e.g. `blocked`, `abandoned`).
- `story.urgency` — allowed values for the `urgency:` field. Default:
  `[now, soon, later]`. Some projects use tier names (`p0..p4`) directly
  here, or mix both.
- `story.impact` — allowed values for the `impact:` field. Default:
  `[H, M, L]`. Override for projects that prefer `[high, medium, low]`
  or another taxonomy.
- `story.id.tiers` — filename tier prefixes like `p0`…`p4`. Empty list
  `[]` means the project does not use tier prefixes.
- `story.id.pattern` — regex accepting valid story `id:` values in
  frontmatter. Use this to validate new stories and to normalise
  `depends_on` typos. Default: `^(P\d+(\.\d+)?|[a-z][a-z0-9-]+)$`.

Adding to a list in `doccraft.yaml` teaches the skill a new valid
value without touching this file (which `doccraft update` regenerates).
That is the intended way to extend vocabulary for a project.

## Package context

<!-- doccraft:packages -->
<!-- /doccraft:packages -->

For monorepo projects, stories may live at the project root or under a
declared package's `{{DOCS_DIR}}/stories/` tree (a **Known package roots**
block appears above when packages are declared). For single-root projects
no block appears, every story lives at the project-root
`{{DOCS_DIR}}/stories/`, and the namespace rules below do not apply.

When the project declares packages, decide which scope to write to:

- **Explicit `package:` arg.** If the user names a package (e.g. "create
  a story for `audio-engine`"), write to that package's
  `{{DOCS_DIR}}/stories/` and use the namespaced id form
  `<slug>/STR-NNNN`.
- **Active-file inference.** If the user is editing a file under a
  declared package path, default to that package's docs root.
- **Root default.** Otherwise, write to the project-root
  `{{DOCS_DIR}}/stories/` with an unprefixed id.

In `depends_on`, the form `<slug>/STR-NNNN` references a story under that
package's `{{DOCS_DIR}}/stories/`; unprefixed ids always refer to the
project-root scope. The same namespace rule applies to `adr_refs`
(unprefixed = root, `<slug>/NNN-slug.md` = package-scoped).

## Workflow reminders

- Move `status` to `in_progress` when you start implementation; `done` when
  shipped or explicitly abandoned (note why in body if abandoned).
- After creating a story or changing `depends_on`, invoke
  `doccraft-queue-audit` in the same turn so the working queue stays
  consistent with the dependency graph.
- When closing a story (`status: done`), update `{{DOCS_DIR}}/queue.md`
  and the **Status** column in `{{DOCS_DIR}}/backlog.md` in the same commit.

<!-- doccraft:inject point=story.instructions -->
<!-- /doccraft:inject -->
