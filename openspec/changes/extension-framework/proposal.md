## Why

doccraft ships three bespoke opt-in mechanisms — `features: ["business"]` with
`feature:` frontmatter gating, the `{{BUSINESS_INTEGRATION_BLOCK}}` and
`{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholders, and a `runDesignerSkills`
subprocess — each reinventing the same pattern: "optional content layered onto
skill bodies and/or scaffolded into `docs/`". The drift audit on audio-stage
(the only consumer) confirmed both that the pattern is recurring (more layers
are coming) and that business/design content does not belong in this repo at
all. [ADR 013](../../../docs/adr/013-extension-framework.md) committed to a
single mechanism — this change implements it.

## What Changes

- Add `extensions: [{ path }]` array to the `doccraft.json` schema. Paths are
  relative to project root, declaration order is significant.
- Define the per-extension manifest shape (`extension.yaml`: `name`, `version`,
  optional `injects[]`, optional `scaffold[]`).
- Enumerate the v1 injection-point taxonomy per ADR 013 §3 (story.frontmatter.fields,
  story.body.sections, story.instructions; adr.frontmatter.fields,
  adr.body.sections, adr.instructions; queue.instructions, queue.artifact-types;
  session-wrap.artifact-types, session-wrap.instructions).
- Adopt the marker syntax `<!-- doccraft:inject point=X -->` and
  `<!-- /doccraft:inject -->` in template skill bodies. Replace existing
  `{{BUSINESS_INTEGRATION_BLOCK}}` and `{{MODEL_HINTS_INTEGRATION_BLOCK}}`
  placeholders with markers (or remove if no longer applicable).
- Implement the bake step in `installSkills`: for each template skill, walk
  markers, concatenate matching fragments in extension declaration order,
  strip empty marker pairs, write the result to `.claude/skills/`.
- Implement the scaffold step: for each declared extension with `scaffold[]`,
  copy source trees into target paths using never-overwrite semantics
  (same as `scaffoldDocsIfMissing`).
- Hard-error at update on unknown injection points, malformed
  `extension.yaml`, or missing fragment files.
- **BREAKING:** Remove `features` field from `doccraft.json` schema. Remove
  `feature:` frontmatter gating in `installSkills`. Remove `--features` CLI
  flag from `init`.
- **BREAKING:** Delete `templates/skills/doccraft-business/`. Audio-stage will
  ship the business content as an extension in its own repo.
- **BREAKING:** Delete `src/utils/designer-skills.ts` and the design feature
  subprocess install. Audio-stage will wire designer-skills outside doccraft.
- **BREAKING:** Delete `BUSINESS_BLOCK_QUEUE_AUDIT`, `BUSINESS_BLOCK_STORY`,
  `MODEL_HINTS_BLOCK_STORY` string literals, `applyBusinessBlock`,
  `applyModelHintsBlock`, `getSkillFeature`, `readFeaturesFromConfig`,
  `writeFeaturesToConfig`, `readStoryModelHintsFromConfig`,
  `ensureModelHintsRegistryFile` from `src/utils/skills.ts`. Remove their
  callers in `init.ts` and `update.ts`.
- Update the `doccraft-config` skill body to describe `extensions[]` and drop
  references to `features[]`, `story.modelHints`, and design.
- Update `templates/docs/reference/model-hints.md` removal: the bundled
  starter is no longer auto-seeded. (Audio-stage may carry it as a scaffold
  fragment in its own extension if still desired.)
- Acceptable trade-off: only audio-stage is affected; coordinated extension
  migration happens in audio-stage immediately after this lands.

## Capabilities

### New Capabilities
- `extensions`: Declarative bake-time extension mechanism for skill bodies
  and scaffolded `docs/` content. Covers manifest schema, injection-point
  taxonomy, marker syntax, baker/scaffold execution, and error semantics.

### Modified Capabilities
- `json-config`: Schema gains `extensions[]`; loses `features[]` and
  `story.modelHints`. Removal of `features` is a breaking schema change.
- `doccraft-update-skill`: Update flow gains an extension-bake phase between
  template read and `.claude/skills/` write; loses the business-block,
  model-hints-block, and design-subprocess phases.
- `design-feature-lifecycle`: Capability is **removed** in this change. Delta
  spec strips all requirements and points readers to the `extensions`
  mechanism for how audio-stage carries designer-skills going forward.
- `designer-story-signal`: Capability is **removed** in this change. Delta
  spec strips the `designer:` story field requirement; audio-stage's
  extension may re-introduce it via `story.frontmatter.fields`.
- `story-model-hints`: Capability is **removed** in this change. Delta spec
  strips the `story.modelHints` config field and the auto-seed of the
  reference markdown; audio-stage's extension may re-introduce the field
  via `story.frontmatter.fields` and ship its own reference scaffold.

## Impact

- **Code:**
  - `src/utils/skills.ts` — large reduction (drop ~150 lines of feature/block
    helpers); add ~250 lines for manifest loader, marker walker, baker, and
    scaffold copier.
  - `src/utils/config-schema.ts` — drop `features`, drop `story.modelHints`;
    add `extensions[]` schema entry.
  - `src/utils/designer-skills.ts` — deleted.
  - `src/commands/init.ts` — drop `--features` flag and its persistence;
    drop `runDesignerSkills` and `ensureModelHintsRegistryFile` calls.
  - `src/commands/update.ts` — drop `runDesignerSkills` replay; keep
    `installDoccraftSkills` (the new baker lives inside).
  - `templates/skills/doccraft-story/SKILL.md`,
    `templates/skills/doccraft-adr/SKILL.md`,
    `templates/skills/doccraft-queue-audit/SKILL.md`,
    `templates/skills/doccraft-session-wrap/SKILL.md` — replace existing
    placeholders with `<!-- doccraft:inject -->` markers at the
    enumerated points.
  - `templates/skills/doccraft-config/SKILL.md` — body update to describe
    `extensions[]`.
  - `templates/skills/doccraft-business/` — deleted.
  - `templates/doccraft.json` — schema scaffold updated.
- **Tests:** vitest covering manifest validation, marker discovery,
  fragment concatenation order, scaffold never-overwrite, unknown-point
  errors, missing-fragment errors. Existing tests for business/design
  features are deleted.
- **External:** audio-stage repo needs a follow-up: copy `doccraft-business`
  content + scaffold tree into `docs/.doccraft/extensions/business/`,
  delete `features: ["business", "design"]` from its `doccraft.json`,
  re-wire designer-skills install via its own tooling. Tracked as a
  separate change in audio-stage, not in this repo.
- **No backwards compatibility shims.** This is a clean break; per
  CLAUDE.md guidance, no `--features-legacy` flag, no migration code.
