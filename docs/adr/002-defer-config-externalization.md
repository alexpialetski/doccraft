# ADR 002: Defer docs/config.yaml externalization until after all four skills ship

**Status:** Accepted

## Context

Shipped skills contain vocabulary that is genuinely project-specific: tag
values under `area:` / `slice:` / `theme:`, story `id` conventions (P-tier vs
custom), the layout of `docs/queue.md` tables, dependency-graph rules. These
values live today inside `SKILL.md` files that `doccraft update` regenerates
from `templates/`. User edits to those tables survive once, then get
overwritten on the next update — silent data loss.

The load-bearing fix is to externalize the project-specific surface into a
config file the skills read at runtime, with in-skill defaults as a
last-resort fallback. The natural file is `docs/config.yaml` (stays under the
already-owned `docs/` folder, survives `--skip-openspec`, doesn't squat on
OpenSpec's `openspec/config.yaml` schema).

## Decision

Defer config externalization until all four skills (story, adr, session-wrap,
queue-audit) are ported. Ship v0.x with opinionated defaults baked into the
skills plus a managed-by-doccraft header warning users that their edits will
be overwritten, pointing at `docs/config.yaml` as the planned home.

The ordering matters: `doccraft-queue-audit` has by far the largest
configurable surface — id conventions, `depends_on` graph rules, the
parallel-waves lane heuristic, story-location glob. Designing the config
schema against story + adr + session-wrap alone would lock in a shape that
fights queue-audit later. Porting all four first surfaces the real surface,
then externalization happens against the full picture.

## Consequences

- + The shipped v0.x install is usable immediately with no config step.
  Zero-config users get opinionated defaults; no blank-page decision.
- + Config schema designed against all four skills' actual surface, not
  three-quarters of it.
- + The managed-file header sets expectations at the point users would
  otherwise learn about drift the hard way (during the first `doccraft
  update` run).
- - Users who need different vocabulary *today* must pin their doccraft
  version or maintain their vocabulary outside SKILL.md until the config
  layer ships.
- - One more release gate between v0.x and the users who need config.

## Alternatives considered

- **Ship `docs/config.yaml` now with empty defaults.** Rejected: forces a
  blank-vocabulary decision at install time, which is exactly the friction
  doccraft's opinionated defaults exist to remove.
- **Ship `docs/config.yaml` now with defaults duplicated across skill and
  config.** Rejected: creates two sources of truth, doubles maintenance
  burden, and defeats the point of a config layer.
- **Keep vocabulary static in skills forever.** Rejected: real projects have
  genuinely different tag sets, queue layouts, and id conventions. The
  drift-on-update bug is a recurring tax on every user that edits the
  tables.
