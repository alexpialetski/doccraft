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

P2.1 (parallel-waves split watch) and P2.2 (docs-maintenance skill family)
remain in the backlog for later consideration.

**Recently shipped:**

- Template refresh + vocab enums (4.2.0). Adds configurable
  `story.status`, `story.urgency`, `story.impact` enums to the
  schema — projects extend the allowed values in `doccraft.json` rather
  than hand-editing skill bodies. Rewrites the bundled `docs/README.md`,
  `docs/backlog.md`, and `docs/queue.md` templates with the patterns
  audio-stage evolved (ship checklist, Planned/Shipped split per tier,
  parallel-ok queue subsection, Cursor integration table). Seeds new
  `docs/reference/` and `docs/research/` scaffolds with README
  placeholders. `doccraft-story` template body updated to reference the
  new vocab config keys and show `adr_refs:` in its example.
- Monorepo support (ADR 014). `packages: [{ path }]` in doccraft.json
  opts each declared package into its own `<docsDir>/` tree (stories,
  ADRs, queue, backlog) scaffolded from the bundled `templates/docs/`.
  New `<!-- doccraft:packages -->` directive bakes a "Known package
  roots" block into the four core skill bodies; skill prose teaches the
  namespaced-id convention (`pkg/STR-NNNN`) and the package-context
  resolution rules. Additive — `packages: []` or absent preserves
  byte-identical 4.0.0 behaviour. Marker parser generalised to
  dispatch on directive name (`inject` vs `packages`). See
  [openspec/changes/monorepo-support](../openspec/changes/monorepo-support).
- Extension framework (ADR 013). Bake-time injection markers
  (`<!-- doccraft:inject point=... -->`) and scaffold copying replace
  the bespoke `features` array, `feature:` frontmatter gate,
  business/model-hints integration blocks, and the designer-skills
  subprocess. Audio-stage carries business/design/model-hints as
  extensions in its own repo. Breaking change in
  [openspec/changes/extension-framework](../openspec/changes/extension-framework).
- P1.5 — JSON config (`doccraft.json` with `$schema` + `version` stamp),
  `doccraft llm` manifest command, `doccraft-config` skill (analyse + edit
  modes), `doccraft-update` skill (silent + assisted paths). See
  [story](stories/p1-assisted-setup-and-migration.md) and
  [ADR 009](adr/009-llm-command-and-assisted-setup.md)
  (supersedes ADR 008).
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
