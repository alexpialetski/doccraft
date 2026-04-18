# ADR 005: Consolidate skills install to `.claude/skills/` for dual-tool projects (opt-in)

**Status:** Accepted

## Context

ADR 001 established a per-tool install contract: `installSkills()` writes
byte-identical `SKILL.md` into every selected tool's `skills/` directory
(`.claude/skills/<name>/SKILL.md` and `.cursor/skills/<name>/SKILL.md`).

Spike P1.1 asked whether that dual-write is still necessary given
recent Cursor behaviour. Two findings:

1. **Cursor auto-discovers `.claude/skills/`.** Confirmed empirically in
   a scratch project containing only `.claude/skills/<name>/SKILL.md`
   and no `.cursor/skills/` entries — the skill surfaced in Cursor and
   triggered on matching prompts. Also documented in the Cursor 2.4
   changelog alongside `.codex/skills/` and `.cursor/skills/`.
2. **Cursor does not deduplicate across directories.** A community bug
   report documents Cursor loading every `SKILL.md` it finds without
   dedupe or version-control logic. For dual-install projects that means
   every skill is loaded twice, wasting context window.

So the current behaviour is not just redundant for dual-tool users — it
is actively harmful. But the `.claude/` folder is semantically
Claude-owned; Cursor-only teams don't have one and shouldn't grow one
just because we can share it.

## Decision

Add an opt-in `--consolidate` flag to `doccraft install` for dual-tool
projects. When set:

- `SKILL.md` is written **only** to `.claude/skills/<name>/SKILL.md`.
- `.cursor/skills/` is **not** populated.
- `.cursor/rules/*.mdc` stubs are still emitted per ADR 003 (they're a
  separate Cursor-native primitive, unaffected by skill discovery).

Without `--consolidate` the existing dual-write behaviour is unchanged,
so Claude-only and Cursor-only installs, and dual-tool installs that
haven't opted in, see no change.

The flag is **opt-in, not default**:

- Cursor-only teams don't have a `.claude/` folder; defaulting to
  consolidation would force one on them.
- Auto-detecting "both tools installed" at install time is fragile —
  presence of `.claude/` or `.cursor/` on disk is not a reliable signal
  of which tools the user actually runs.
- Flipping dual-tool users to consolidated output silently would be a
  behaviour change without their consent; the duplicate-loading cost is
  real but not catastrophic, and users can evaluate before opting in.

Revisit defaulting the flag on when/if Cursor ships cross-directory
dedupe — at that point the choice becomes purely about footprint and
the asymmetry argument weakens.

## Consequences

- + Dual-tool users opt in once; Cursor stops loading every skill twice.
  Context window reclaimed without changing skill content.
- + Install output halves for consolidated projects (one `SKILL.md` per
  skill instead of two). Smaller git footprint, one place to inspect.
- + `.cursor/rules/*.mdc` stubs remain the Cursor-native glob-attach
  primitive per ADR 003 — consolidation doesn't weaken Cursor UX.
- - One more flag in the install CLI surface. Documented in the `init`
  and `update` help text; mentioned in `docs/README.md`.
- - Cursor version floor: discovery of `.claude/skills/` requires
  Cursor 2.4+. Users on older Cursor who opt in will not see skills.
  `--consolidate` documentation states the version requirement.
- - If Cursor later adds dedupe, the flag becomes redundant and we may
  want to default it on (or retire it). Acceptable — the flag is cheap
  to keep and easy to flip.

## Alternatives considered

- **Default `--consolidate` on when both `.claude/` and `.cursor/` are
  present.** Rejected: directory presence is a weak signal, and silent
  behaviour changes for existing dual-tool users are the worst kind of
  surprise. Revisit once the signal is stronger (e.g. explicit tool
  declarations in `docs/config.yaml`).

- **Keep dual-write, add a deduplication note to the README.** Rejected:
  pushes the fix onto users who have no lever to pull; the dual-load is
  a doccraft output choice, not a Cursor setting.

- **Always consolidate — drop `.cursor/skills/` entirely.** Rejected:
  Cursor-only teams would be forced to create a `.claude/` folder in
  their repo, which is semantically wrong. `.cursor/skills/` must remain
  the default target for Cursor-only installs.

- **Wait for Cursor to add cross-directory dedupe.** Rejected: no public
  timeline, and the cost to ship an opt-in flag now is low. If/when
  Cursor fixes it upstream the flag becomes a no-op we can retire.

## Follow-ups not in scope for this ADR

- Implementation story (installer changes, CLI surface, tests) —
  tracked separately as the P1.1 implementation follow-up.
- Defaulting `--consolidate` on — revisit when Cursor dedupes, or when
  `docs/config.yaml` gains an explicit tool-declaration key that
  replaces directory-presence heuristics.
