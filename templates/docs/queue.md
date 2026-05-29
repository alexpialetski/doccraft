# Working queue ("what next")

A short ordered list of what to pick next, with links to
[`stories/`](stories/). Reorder rows as priorities shift; when a story
ships, move its row in [`backlog.md`](backlog.md) from **Planned** to
**Shipped (reference)**.

The editorial process — inputs, ordering rules, dependency precedence,
parallel waves — lives in the `doccraft-queue-audit` skill. Invoke that
skill after changes to `depends_on` or queue reordering so the tables
and story YAML do not drift apart.

## How to update this queue

- **Add a row** when picking up a story or surfacing a new high-priority
  candidate. The row links to the story file; the label is the story
  id (or `pkg-slug/id` for package-scoped stories in a monorepo).
- **Reorder** when priorities shift. Per
  [`doccraft-queue-audit`](../.claude/skills/doccraft-queue-audit/SKILL.md),
  unfinished prerequisites must appear above the rows that depend on
  them (unless the row's Notes column documents accepted parallel
  work).
- **Drop a row** when the story is `done` or no longer a near-term
  pick. Shipped stories disappear from the queue entirely.
- **After any edit** that touches dependencies, run
  `doccraft-queue-audit`.

## Fields (reminder)

Stories use YAML frontmatter per the
[`doccraft-story`](../.claude/skills/doccraft-story/SKILL.md) skill:
`impact`, `urgency`, optional `depends_on`, `openspec`, prefixed
`tags`. The accepted values for `impact`, `urgency`, and `status` live
in `doccraft.json` under `story.*` — extend the config rather than
inventing values in story files.

## Suggested order (maintenance view)

The main pick-next queue. Lower row index = higher priority. Stories
whose prerequisites are not yet `done` must appear below those
prerequisites unless an explicit parallel-work note says otherwise.

| # | Item | Story |
|---|------|-------|
|   |      |       |

## Parallel-ok with the main chain

Stories that can advance in parallel with the main queue above —
independent scope, no shared prerequisites with the top rows. Useful
when a teammate or agent picks up adjacent work without conflicting.

| # | Item | Story |
|---|------|-------|
|   |      |       |

## Platform spikes (can run in parallel)

Exploratory or research work not yet ready for the main queue. Include
in audit passes only when the user asks.

| # | Item | Story |
|---|------|-------|
|   |      |       |
