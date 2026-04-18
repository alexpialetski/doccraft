# ADR 004: docs/config.yaml schema — shape, location, lifecycle

**Status:** Superseded by [ADR 008](008-doccraft-yaml-at-root-with-docsdir.md)

## Context

ADR 002 committed to externalizing project-specific vocabulary to
`docs/config.yaml` after all four skills had shipped. With the port
complete (all four installed skills referencing this layer in their
managed-by-doccraft header), P0.1 is the moment to finalize the schema.

Three orthogonal decisions need pinning before code: the schema shape
(flat vs. nested, per-section vs. single-object), how skills consume the
config (runtime read vs. install-time template generation), and the
file's lifecycle (who writes it, what happens on update, what happens
when it's missing).

The nontrivial constraint: users edit this file. Every shape decision is
also an UX decision. A deeply nested schema creates friction for single-
key overrides; a flat schema creates naming collisions between skills.

## Decision

### Shape — per-skill sections with related keys nested

YAML at `docs/config.yaml` with one top-level key per skill area, and
sub-objects where keys are genuinely related:

```yaml
story:
  areas: […]        slices: […]        themes: […]
  id:
    tiers: […]
    pattern: '…'
adr:
  path: docs/adr
queue:
  path: docs/queue.md
  tables:
    suggestedOrder: Suggested order
    platformSpikes: Platform spikes
backlog:
  path: docs/backlog.md
queueAudit:
  laneFrom: [area, slice]
  scale:
    maxStoryFiles: 5
    maxQueueReorderPct: 50
sessionWrap:
  capture:
    research: true    reference: true    business: false
```

`story.id.{tiers,pattern}` are nested because they describe one concept
(story identifiers). `queue.tables.{suggestedOrder,platformSpikes}` are
nested because they're the same kind of thing (heading names). Flat
single-key sections (`adr.path`, `backlog.path`) don't get a sub-object
for its own sake.

### Consumption — skills read at invocation; defaults stay in skill body

Each skill's `SKILL.md` gained a **Configuration** section near the top
naming the keys it consults. Body tables remain as fallbacks used when
the config file is missing or a key is absent. Missing config is a soft
fallback, not an error.

### Lifecycle — scaffold once, never overwrite

`doccraft init` writes the template to `docs/config.yaml` via the same
`scaffoldDocsIfMissing` helper that seeds `docs/README.md` and friends.
`doccraft update` does not touch the file after first write. Deleting
the file is supported (every key falls back to its skill-body default).

## Consequences

- + Users override only the keys they care about; the rest fall through
  to shipped defaults. Edits survive `doccraft update`.
- + Adding a key is a minor-version bump; removing one is major. Schema
  stability is now explicitly a release-gate concern.
- + Changing the default for any shipped key is a behaviour change
  requiring an ADR or migration note.
- + The in-skill default tables double as readable documentation of what
  the defaults *are* — users see the shape they're overriding.
- - Every skill's SKILL.md grew ~15 lines (the Configuration section).
  That's the cost of making the customisation surface explicit to the
  model at invocation.
- - Skills now rely on the model reading `docs/config.yaml` correctly.
  Malformed YAML falls back to defaults silently; users don't get a hard
  error. Acceptable tradeoff — the alternative (hard-fail on every
  invocation) is worse.

## Alternatives considered

- **Flat single-object schema** — e.g. `storyAreas: […]` at top level.
  Rejected: collision-prone, harder to extend per-skill, and visually
  louder. The per-section grouping makes the file easier to skim.

- **Config-driven template generation.** `doccraft init` reads the
  user's config and generates project-specific SKILL.md files with
  values interpolated. Rejected: fights the fix. Config changes would
  still require `doccraft update` to take effect, reintroducing the
  drift-on-update bug from a new angle (user edits config, forgets
  update, skills don't reflect the change).

- **Per-skill config files** (`docs/.doccraft-story.yaml`,
  `docs/.doccraft-adr.yaml`, …). Rejected: extra files per project, no
  value from the separation given skills already read the same file.
  Would also complicate "where do I set X?" answers.

- **JSON or TOML.** Rejected: YAML ergonomics dominate for hand-edited
  commented config files. JSON has no comments; TOML has comments but
  feels heavy for short nested values like the tag lists. YAML is also
  the format already established by OpenSpec (`openspec/config.yaml`)
  and the skill frontmatter itself.

- **Schema validation at install time.** Considered, deferred. A JSON
  Schema for editor support could land in a later release. For now,
  malformed config falls back to defaults silently — strictly a soft
  failure.

## Follow-ups not in scope for this ADR

- Editor integration (JSON Schema for `docs/config.yaml`) — add when a
  user reports confusion about valid shapes.
- Migration helper for breaking schema changes — relevant only when the
  schema actually breaks; not speculative.
- Runtime validation of user-supplied values (e.g. "is this regex well-
  formed?") — handled naturally by the model reading the file; not a
  pipeline concern.
