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
| 1 | P1.5 — assisted setup and migration (JSON config, `doccraft llm`, `doccraft-config` / `doccraft-update` skills) | [p1-assisted-setup-and-migration.md](stories/p1-assisted-setup-and-migration.md) |

P1.5 is the next pick. P2.1 (parallel-waves split watch) and P2.2
(docs-maintenance skill family) remain in the backlog for later
consideration.

**Recently shipped:**

- P1.4 — default skill install to `.claude/skills/`; `--consolidate`
  flag removed. Cursor 2.4+ auto-discovers the canonical Agent Skills
  location; dual-write is no longer needed or desirable. See
  [story](stories/p1-default-to-claude-skills.md) and
  [ADR 007](adr/007-default-skill-install-to-claude-skills.md)
  (supersedes ADR 005's default stance).
- P1.2 — `--consolidate` install flag (superseded by P1.4; flag
  removed). See [story](stories/p1-consolidate-install-flag.md) and
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
