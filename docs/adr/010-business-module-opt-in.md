# ADR 010 — Business module as an opt-in feature

**Status:** Accepted  
**Date:** 2026-04-24

---

## Context

The `doccraft-business` skill (startup-wisdom advisor + requirements
interviewer) and the companion `business-insights-extractor` tool were
prototyped project-locally in audio-stage and validated against real business
artifacts before promotion to this package.

Several constraints drive the design:

- **Not universally useful.** Open-source libraries, internal tooling, and
  purely technical SDKs do not maintain `docs/business/` artifacts. Installing
  a business advisor into these projects adds noise without value.
- **business-insights-extractor is maintainer-only.** It ingests external
  source material (Telegram HTML exports, markdown articles) and distils them
  into `startup-wisdom.md`. It is a doccraft-development tool, not a
  user-facing skill, and must never ship inside the npm package.
- **queue-audit and story need context-conditional behaviour.** When
  `business` is enabled, both skills should consult `docs/business/` for
  priority tiebreaking and audience alignment. Without the feature, those
  references are irrelevant noise.
- **No existing opt-in mechanism.** All skills currently install wholesale.
  A general-purpose feature-flag system is needed.

## Decision

### 1. `features` array in `doccraft.json`

Add an optional `"features"` string array to the schema:

```json
{ "features": ["business"] }
```

Defaults to absent (treated as `[]`). The CLI and install pipeline
check this key to decide which optional skills to install and which
conditional template blocks to expand.

### 2. Skill-level feature gating via frontmatter

Optional skills declare their requirement in SKILL.md frontmatter:

```yaml
---
name: doccraft-business
feature: business
---
```

During `installSkills`, the pipeline reads the frontmatter of every
candidate template. If `feature: <name>` is present and `<name>` is
not in `features`, the skill is skipped.

### 3. `{{BUSINESS_INTEGRATION_BLOCK}}` template substitution

`doccraft-queue-audit/SKILL.md` and `doccraft-story/SKILL.md` contain
the placeholder `{{BUSINESS_INTEGRATION_BLOCK}}`. During install:

- If `business` is in `features`: replaced with a skill-specific section
  instructing the skill to consult `docs/business/` for priority decisions.
- If not: replaced with an empty string.

This preserves a single template file per skill rather than branching into
feature-specific variants.

Substitution order: `{{BUSINESS_INTEGRATION_BLOCK}}` is applied **before**
`{{DOCS_DIR}}`, so any `{{DOCS_DIR}}` references inside the block are
resolved correctly.

### 4. `--features` CLI flag on `init`

```bash
doccraft init --features business
```

Writes the resolved features array into `doccraft.json` (merging with
existing values) immediately after scaffolding, so subsequent `doccraft
update` runs pick it up automatically from the file.

`doccraft update` reads features from the existing `doccraft.json`
— no flag needed.

### 5. business-insights-extractor placement

The tool lives at `doccraft/.claude/skills/business-insights-extractor/`
(the repo's own skill directory). It is **not** in `templates/skills/`
and therefore **not** included in the npm package. The `files` field in
`package.json` lists `templates/` but not `.claude/` — no change needed.

### 6. Naming

The skill is named `doccraft-business` in `templates/skills/` (matching
the existing `doccraft-*` convention). The project-local prototype in
audio-stage was named `business` to survive `doccraft update`; that
constraint no longer applies once it is the canonical upstream version.

## Consequences

**Positive:**
- Projects that do not maintain `docs/business/` are unaffected.
- queue-audit and story skills stay clean for non-business projects.
- business-insights-extractor stays private to the doccraft development
  workflow, as intended.
- The `features` mechanism is general enough to gate future optional
  modules (e.g. `i18n`, `design`) without architectural changes.

**Negative / watch:**
- Init flow has a new optional step (features prompt or `--features` flag).
  Users who skip it get no business skill, which is correct but may
  surprise them if they expected it to be automatic.
- `doccraft update` relies on `doccraft.json` being present and containing
  `features` to reinstall the business skill. If the user deletes the key,
  the skill disappears on next update.
- `sessionWrap.capture.business` is a separate toggle from `features:
  ["business"]`. Setting one does not auto-set the other — users must
  enable both if they want full integration. This is intentional (they can
  have the skill without session-wrap tracking business docs, or vice
  versa), but it is a footgun worth documenting.
