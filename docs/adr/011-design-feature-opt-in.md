# ADR 011 — Design feature as an opt-in module

**Status:** Accepted  
**Date:** 2026-05-01

---

## Context

[ADR 010](010-business-module-opt-in.md) introduced the `features` array in
`doccraft.json` and noted explicitly that the mechanism is *"general enough to
gate future optional modules (e.g. `i18n`, `design`) without architectural
changes."*

A mature, openly-licensed skill set for UI design workflows exists at
[julianoczkowski/designer-skills](https://github.com/julianoczkowski/designer-skills).
It provides 8 skills (`grill-me`, `design-brief`, `information-architecture`,
`design-tokens`, `brief-to-tasks`, `frontend-design`, `design-review`, and the
orchestrating `design-flow`) that encode a structured design-to-build process
for AI coding tools.

Several constraints drive this decision:

- **Not universally needed.** Backend libraries, CLIs, and data pipelines have
  no UI surface. Installing design skills into these projects adds noise without
  value.
- **No vendoring.** Copying the skill files into doccraft's `templates/skills/`
  creates a fork to maintain. The upstream is actively developed and Apache 2.0
  licensed; staying in sync would be an ongoing burden with no architectural
  benefit.
- **Target install path is known.** Running `npx skills add
  julianoczkowski/designer-skills --agent claude-code --yes` in a project
  directory places every skill under `.claude/skills/<name>/SKILL.md` —
  exactly the canonical path doccraft uses (ADR 007). Verified empirically.
- **Story-level signal is useful.** Projects that enable design workflows
  benefit from a `designer:` field on stories (mirroring the existing
  `openspec:` field) to flag which stories require a design pass before
  implementation.

## Decision

### 1. `design` feature flag

Add `"design"` as a recognised value in the `features` array in
`doccraft.json`:

```json
{ "features": ["design"] }
```

Enabled via `doccraft init --features design`. Persisted to `doccraft.json`
so `doccraft update` reinstalls without a flag.

### 2. Subprocess install — no vendoring

When `design` is in `features`, doccraft spawns the Vercel skills CLI as a
subprocess during `init` and `update`:

```
npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes
```

This is the same subprocess pattern used for OpenSpec (`src/utils/openspec.ts`
→ `runOpenspec`). A new `src/utils/designer-skills.ts` module (`runDesignerSkills`)
will follow the same shape.

Skills land at `.claude/skills/<name>/` — the canonical install target — so
Cursor and Claude Code discover them automatically alongside doccraft's own
skills. No path post-processing required.

### 3. `designer:` field on stories

Add an optional `designer` field to the story frontmatter contract in
`templates/skills/doccraft-story/SKILL.md`:

| Value | Meaning |
|-------|---------|
| `not-needed` | No UI surface; design skills irrelevant. |
| `recommended` | New screen, layout change, or ambiguous visual direction; run `/design-flow` before building. |
| `required` | Project policy: design review gate enforced before any UI lands. |

Mirrors the existing `openspec:` field — same three-value enum, same guidance
pattern. The field is optional (not required) to avoid burdening backend-only
stories.

`doccraft-queue-audit` will surface `designer: required` stories as blocked
if no `.design/` artifacts exist for the relevant feature, similar to how it
handles `openspec: required` stories.

### 4. Naming

The subprocess wrapper is `runDesignerSkills`, consistent with `runOpenspec`.
No doccraft-prefixed skills are added to `templates/skills/` — the feature
installs exclusively from the upstream package.

## Consequences

**Positive:**
- Projects that have no UI are unaffected; the flag is opt-in.
- No fork to maintain. Upstream updates are picked up automatically on
  `doccraft update` for projects with `"design"` in features.
- The install path is already the canonical `.claude/skills/` location;
  no extra wiring needed for Cursor or Claude Code discovery.
- The `designer:` story field gives agents and humans a clear signal
  that a design pass is expected before implementation starts.

**Negative / watch:**
- Network call at install time (skills CLI clones from GitHub). Same
  trade-off accepted for OpenSpec.
- The skills CLI (`npx skills add`) must be resolvable via `npx`. If
  the user's environment blocks GitHub cloning (e.g. strict corporate
  proxy), the subprocess will fail and doccraft should emit a clear
  error with a manual fallback command.
- `designer: required` in queue-audit is a soft gate — it emits a
  warning, not a hard block, since the `.design/` folder check is
  heuristic (the feature may exist under a different slug).
- `designer:` is optional in story frontmatter. Stories without the
  field are treated as `not-needed` by queue-audit for backwards
  compatibility.

## Alternatives considered

- **Vendor the skills in `templates/skills/`** — avoided because it
  creates a fork; any upstream improvement requires a manual sync and
  doccraft release.
- **Document as a companion, leave install manual** — cleaner separation
  but weaker integration; users need two install commands and the
  `designer:` story field has no corresponding skills installed.
- **`--target` flag to redirect install path** — investigated; the
  skills CLI has no `--target` flag. `--agent claude-code` resolves
  to `.claude/skills/` directly, which is the correct destination.
