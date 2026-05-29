# ADR 013: Extension framework — bake-time injection + scaffold

**Status:** Accepted
**Date:** 2026-05-29
**Supersedes:** [ADR 010](010-business-module-opt-in.md), [ADR 011](011-design-feature-opt-in.md)

## Context

doccraft ships two opt-in features today: `business` (ADR 010, a full
skill plus skill-body integration blocks in story/queue-audit) and
`design` (ADR 011, a subprocess install of an external skills pack plus
a `designer:` story field). Each is bolted on with bespoke machinery:

- `features: ["business"]` array in `doccraft.json`.
- `feature:` frontmatter on `doccraft-business/SKILL.md` gates install.
- Hardcoded `{{BUSINESS_INTEGRATION_BLOCK}}` placeholders in `doccraft-story`
  and `doccraft-queue-audit`, replaced at install time with skill-specific
  string literals living in `src/utils/skills.ts`.
- A separate `src/utils/designer-skills.ts` subprocess wrapper for the
  upstream Vercel skills CLI.
- `story.modelHints` (ADR 012) added a *third* one-off placeholder
  (`{{MODEL_HINTS_INTEGRATION_BLOCK}}`) using the same pattern.

Three things have become clear:

1. **The pattern is the same every time.** "Optional content that some
   projects want to layer onto skill bodies and into `docs/`." Each
   feature reinvents the gating, the placeholder, and the install path.
2. **audio-stage (the only consumer) wants to keep extending.** The drift
   audit found `docs/business/`, `docs/agent-rules/`, and per-project
   instructions on top of stories/ADRs — all shaped exactly like
   "extensions that inject into skills and scaffold supporting folders."
3. **business and design no longer belong in this repo.** They're
   project-specific to audio-stage. Keeping them bundled forces every
   doccraft release to carry audio-stage's product opinions.

The user is the only consumer, so a breaking change is acceptable.

## Decision

Introduce a single **extension framework**. Every optional layer
(business, design, model-hints, epics, future) becomes an extension that
declares (a) which skill bodies to inject into and (b) which folders to
scaffold. Remove all bespoke feature machinery.

### 1. `extensions:` in `doccraft.json`

The `features: []` array is removed. Replaced with:

```json
{
  "extensions": [
    { "path": "./docs/.doccraft/extensions/business" },
    { "path": "./docs/.doccraft/extensions/epics" }
  ]
}
```

Paths are relative to project root. Order is significant: extensions
inject in declared order (deterministic concatenation).

### 2. Per-extension manifest

Each extension is a directory containing `extension.yaml`:

```yaml
name: business
version: 0.1.0
injects:
  - skill: doccraft-story
    point: story.instructions
    fragment: ./fragments/story-instructions.md
  - skill: doccraft-story
    point: story.frontmatter.fields
    fragment: ./fragments/story-frontmatter.md
  - skill: doccraft-queue-audit
    point: queue.instructions
    fragment: ./fragments/queue-instructions.md
scaffold:
  - source: ./scaffold/docs/business/
    target: docs/business/
```

Both `injects` and `scaffold` are optional — an extension may do either
or both. `scaffold` follows the same never-overwrite semantics as
`scaffoldDocsIfMissing`: existing files are preserved.

### 3. Injection-point taxonomy (v1)

Enumerated, small, stable. Unknown points are a hard error at update.

| Skill | Points |
|-------|--------|
| `doccraft-story` | `story.frontmatter.fields`, `story.body.sections`, `story.instructions` |
| `doccraft-adr` | `adr.frontmatter.fields`, `adr.body.sections`, `adr.instructions` |
| `doccraft-queue-audit` | `queue.instructions`, `queue.artifact-types` |
| `doccraft-session-wrap` | `session-wrap.artifact-types`, `session-wrap.instructions` |

Each skill template embeds markers for the points it owns. Adding a new
point is a minor bump; removing one is major.

### 4. Marker syntax

```markdown
<!-- doccraft:inject point=story.instructions -->
<!-- /doccraft:inject -->
```

At `doccraft update`, the installer walks every template skill, finds
each marker, concatenates all fragment bodies whose manifest targets
that `(skill, point)` pair (in extension declaration order), and writes
the baked output to `.claude/skills/`. If no extension targets a marker,
the marker pair is stripped, leaving the base skill clean.

### 5. Lifecycle — bake at update only

No runtime hooks. Skills do not read extension content at invocation
— everything is baked into the skill body at `doccraft update`. This
mirrors how `{{DOCS_DIR}}` and the existing `{{BUSINESS_INTEGRATION_BLOCK}}`
work today, and keeps skills self-contained on disk.

### 6. Removals (breaking)

The following are deleted:

- `features` field in `doccraft.json` schema.
- `feature:` frontmatter gating in `installSkills`.
- `templates/skills/doccraft-business/` (audio-stage now ships this as
  an extension in its own repo).
- `BUSINESS_BLOCK_QUEUE_AUDIT`, `BUSINESS_BLOCK_STORY`,
  `MODEL_HINTS_BLOCK_STORY` string literals and their `apply*Block` helpers
  in `src/utils/skills.ts`. Model hints, if still desired, becomes a
  shipped reference extension or moves entirely to audio-stage.
- `src/utils/designer-skills.ts` and the `--features design` subprocess
  install path. Audio-stage can wire the upstream designer-skills install
  outside doccraft.
- `{{BUSINESS_INTEGRATION_BLOCK}}` and `{{MODEL_HINTS_INTEGRATION_BLOCK}}`
  placeholders in template skills; replaced with `<!-- doccraft:inject -->`
  markers (or removed entirely if no longer applicable).

## Consequences

- **+** One mechanism replaces three. Future opt-in layers don't grow
  `src/utils/skills.ts`.
- **+** Extensions ship outside doccraft. The npm package stays small
  and project-neutral.
- **+** Bake-at-update keeps the runtime story trivial: skills are
  self-contained markdown, no manifest-reading at invocation, no merge
  logic in the LLM's head.
- **+** Extension authors get the same scaffold semantics doccraft uses
  for `templates/docs/` — predictable, never-overwrite.
- **−** Breaking change for anyone with `features: ["business"]` or
  `features: ["design"]` in their `doccraft.json`. Acceptable given
  audio-stage is the only consumer.
- **−** Audio-stage now owns the business/design content. A small
  migration is required: copy the existing skill body and scaffolded
  folders into extension directories under audio-stage's
  `docs/.doccraft/extensions/`.
- **−** Injection-point taxonomy is now part of the public contract.
  Adding/removing points is a semver-relevant change. Acceptable —
  small enumerated lists are easy to keep stable.
- **−** No runtime hooks means extension changes require `doccraft
  update`. Same trade-off the project already accepts for `docsDir`
  and model-hints today.

## Alternatives considered

- **Runtime read** — skill body says "also follow fragments under
  `.doccraft/extensions/<skill>/*.md`". Hot-swappable but the LLM has
  to do the merge in its head, and the skill bodies stay opaque about
  what they actually instruct. Rejected: bake is simpler and the
  user said they don't expect frequent extension churn.
- **Keep `features:` array, generalize the placeholders** — add more
  `{{XYZ_BLOCK}}` hooks. Rejected: doesn't solve "audio-stage's content
  shouldn't ship in doccraft", just adds more bespoke wiring.
- **Vendor extensions in `templates/extensions/`** — same fork problem
  that ADR 011 explicitly avoided for designer-skills. Extensions live
  with the project that uses them.
- **One ADR covering extensions + monorepo together** — rejected; they
  are independent decisions and each warrants its own status surface.
  Monorepo lands in [ADR 014](014-monorepo-package-docs.md).
