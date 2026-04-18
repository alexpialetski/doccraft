# Working queue ("what next")

A short ordered list of what to pick next, with links to [`stories/`](stories/).
Reorder rows as priorities shift; when a story ships, update the **Status**
column in [`backlog.md`](backlog.md) for the matching P-row.

The editorial process (inputs, ordering rules, dependency precedence, parallel
waves) lives in the `doccraft-queue-audit` skill. Invoke that skill after
changes to `depends_on` or queue reordering so the tables and story YAML do
not drift apart.

## Fields (reminder)

Stories use YAML frontmatter per the `doccraft-story` skill: `impact` (H/M/L),
`urgency` (now/soon/later), optional `depends_on`, `openspec`, prefixed `tags`.

## Suggested order (maintenance view)

| # | Item | Story |
|---|------|-------|
|   |      |       |

All planned P0/P1 items have shipped. Next decisions: promote a P2 item
when one becomes urgent, or file new stories based on usage feedback.
The P2.1 (parallel-waves split watch) and P2.2 (docs-maintenance skill
family) items remain in the backlog for later consideration.

**Recently shipped:**

- P1.2 — `--consolidate` install flag writes skills to `.claude/skills/`
  only for dual-tool projects, eliminating Cursor's double-load of every
  skill. See [story](stories/p1-consolidate-install-flag.md) and
  [ADR 005](adr/005-consolidate-skills-for-dual-tool.md).
- P1.3 — doccraft owns tool selection in init (3-option picker,
  forwards `--tools` to openspec). Fixes the first-contact UX gap
  surfaced when a user ran `npx doccraft init` and saw openspec's
  28-tool picker before doccraft's own UI. See
  [story](stories/p1-init-tool-picker.md) and
  [ADR 006](adr/006-doccraft-owns-tool-selection.md).
- P0.1 — externalize project vocabulary to `docs/config.yaml`. See
  [story](stories/p0-docs-config-externalization.md) and
  [ADR 004](adr/004-docs-config-schema.md).
- P1.1 — Cursor `.claude/skills/` discovery spike. See
  [story](stories/p1-cursor-consolidation-spike.md) and
  [ADR 005](adr/005-consolidate-skills-for-dual-tool.md).

## Platform spikes (can run in parallel)

Independent of the main pipeline above — pick up when relevant (e.g. during
downtime, or when a parallel-waves pass finds one is unblocked). Include
these in audit passes only when the user asks.

| # | Item | Story |
|---|------|-------|
|   |      |       |
