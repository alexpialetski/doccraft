# ADR 007: Install skills only to `.claude/skills/`; `.cursor/skills/` is never written

**Status:** Accepted — supersedes the default-install stance of ADR 005.

## Context

ADR 001 pinned a per-tool dual-install: `installSkills()` wrote byte-
identical `SKILL.md` into every selected tool's `skills/` directory
(`.claude/skills/...` and `.cursor/skills/...`).

ADR 005 kept that as the default and added `--consolidate` as an opt-in
for dual-tool projects. The opt-in rationale was partly practical
(Cursor 2.4+ auto-discovers `.claude/skills/`, so dual-write wastes
context) and partly semantic: "Cursor-only teams don't have a `.claude/`
folder and shouldn't grow one just because we can share it."

The practical half held up. The semantic half weakened as `.claude/
skills/` became the de facto canonical Agent Skills location across the
ecosystem — Claude Code reads it natively, Cursor 2.4+ auto-discovers
it, Codex scans a parallel `.codex/skills/`. The directory name
reflects its origin, not ownership of the contents, the same way
`node_modules/` isn't Node-only anymore.

Dogfood signal pushed the decision over: a user running
`npx doccraft init` with no flags saw every install emit two copies of
every skill, the second copy serving no purpose beyond occupying
Cursor's context window. Opt-in-by-flag is strictly worse UX than
opt-in-by-reading-the-README, and both are strictly worse than "the
default is the right thing."

No shipped customers; no backward-compat constraint. Clean break is
cheaper than a deprecation layer.

## Decision

Skills always land at `.claude/skills/` regardless of `--tools`
selection. `.cursor/skills/` is never written by doccraft. Concretely:

| `--tools` | `.claude/skills/` | `.cursor/rules/` | `.cursor/skills/` |
|-----------|-------------------|------------------|-------------------|
| `claude`         | ✓ | — | — |
| `cursor`         | ✓ | ✓ | — |
| `claude,cursor`  | ✓ | ✓ | — |
| `none`           | — | — | — |

Rule stubs (`.cursor/rules/*.mdc`, ADR 003) remain scoped to tools with
a `rulesDir` — Cursor only. Skill location and rule location are now
independent concerns.

The `--consolidate` flag from the 0.6 release is **removed**, not
deprecated. InitOptions and UpdateOptions drop the `consolidate?`
field. `validateConsolidate` and `filterSkillTargets` are removed as
unused.

A one-line reminder prints on `doccraft init` when Cursor is in the
tool selection:

    Note: Cursor 2.4+ required to auto-discover skills at .claude/skills/.

The stale-cursor advisory (`findStaleCursorSkills`) runs
unconditionally after every install and tells the user how to clean up
any doccraft-owned directories left behind by a pre-ADR-007 install.

## Consequences

- + Zero-config install does the right thing. New users get optimised
  layout without reading docs or opting in.
- + No dual-load: Cursor users stop loading every skill twice, no
  context-window waste.
- + Simpler mental model — one skills location, period. The
  `SkillTool.skillsDir` field now only governs rule install target for
  tools that have a `rulesDir` (Cursor). No ambiguity about where
  skills go.
- + Smaller code surface: validateConsolidate, filterSkillTargets,
  InstallOptions, and both `--consolidate` CLI options are removed.
  Net -186 lines at commit time.
- - Cursor version floor becomes universal. Cursor users on Cursor
  <2.4 silently get zero skills. Mitigation: the init-time version
  reminder; README's bundled-skills blurb calls out Cursor 2.4+
  explicitly.
- - `.claude/` directory appears in Cursor-only projects. Acceptable:
  `.claude/skills/` is the canonical Agent Skills location across the
  ecosystem, not a Claude-Code-specific artefact. Same contract
  `.github/` has for projects that don't use GitHub-specific features
  beyond Actions.
- - ADR 005's opt-in design is now superseded as the default stance.
  ADR 005 remains accurate as a historical record of the decision made
  with the information available at that time; its Status line points
  at this ADR.

## Alternatives considered

- **Keep `--consolidate` as a deprecated no-op flag for one release**
  — proposed during discussion. Rejected: no shipped customers to
  shield from breakage. The deprecation layer costs README space,
  console output, and a line in InitOptions for a migration no one
  needs.

- **Use a neutral directory name like `.agent-skills/` or
  `.skills/`** — would avoid the "why does my Cursor-only project have
  a `.claude/` folder" confusion. Rejected: every major tool (Claude
  Code, Cursor 2.4+, Codex) scans `.claude/skills/` out of the box.
  Introducing a new location would require tool vendors to update
  their discovery code — not a lever doccraft has. Revisit if the
  ecosystem settles on a neutral name.

- **Force `--tools claude` downstream to OpenSpec** so its skills
  consolidate too. Rejected: overreach. OpenSpec's install layout is
  its own decision; doccraft forwards `--tools` verbatim and leaves
  the call to OpenSpec. A mixed state (doccraft at `.claude/skills/`,
  OpenSpec at both when `--tools claude,cursor`) is ugly but not
  incorrect.

- **Auto-detect dual-tool presence and consolidate only then**
  — rejected when considered for P1.2; same rejection applies here.
  Directory presence is a weak signal, and the simpler rule ("always
  consolidate") is strictly better now that the semantic objection
  has weakened.

## Follow-ups not in scope for this ADR

- If Cursor ever ships cross-directory dedupe, the `.claude/skills/`
  preference becomes purely about footprint rather than correctness.
  No action needed unless the dedupe arrives alongside a canonical
  neutral location — in which case this ADR gets revisited.

- A `config.yaml` key to override the install target
  (`install.skillsPath: .agent-skills`) could land later if the
  ecosystem fragments. Not urgent.
