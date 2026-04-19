## Why

Three post-install gaps make the doccraft UX incomplete: new users have no guided way to tailor the config after `init`, there is no migration pathway between versions (no version stamp → schema changes break silently), and YAML offers no IDE validation that JSON + `$schema` gives for free. This change closes all three in one coherent arc.

## What Changes

- **BREAKING** `doccraft.yaml` → `doccraft.json` at project root (clean-break rename; no shipped customers yet so no compat shim needed).
- `doccraft.json` gains `"$schema"`, `"version"`, and `"_hint"` as its first three keys; `docsDir` and `{{DOCS_DIR}}` substitution survive.
- JSON Schema for `doccraft.json` lives as a single TypeScript source (`src/utils/config-schema.ts`), emitted to `schema/doccraft.schema.json` inside the npm tarball, inlined into `doccraft llm` output, and substituted into the `doccraft-config` skill template via `{{DOCCRAFT_CONFIG_SCHEMA}}`.
- New top-level CLI command `doccraft llm` emits a compact JSON manifest with `version`, `bundledOpenspecVersion`, `schema`, `skills[]`, and `migrations[]`.
- `doccraft update` performs a surgical edit on `doccraft.json`: rewrites `version` and the version segment of `$schema` URL in one pass, preserving every other byte.
- `{{DOCCRAFT_VERSION}}` build-time placeholder substituted from `package.json` into the CLI source; no runtime `require('../package.json')`.
- New `doccraft-config` skill (two modes: analyse + edit) installed under `.claude/skills/`.
- New `doccraft-update` skill (silent-by-default update with optional assisted migration path) installed under `.claude/skills/`.
- Dogfood `doccraft.yaml` in this repo migrated to `doccraft.json`.
- README and CLAUDE.md updated for JSON config and two new skills.

## Capabilities

### New Capabilities

- `json-config`: Scaffolded `doccraft.json` with `$schema`, `version`, `_hint`, and existing fields. Replaces `doccraft.yaml`. Schema source emitted to npm tarball and served via jsDelivr.
- `llm-manifest`: `doccraft llm` command emitting compact JSON manifest for LLM/skill consumption — version, bundledOpenspecVersion, schema, skills, migrations.
- `doccraft-config-skill`: Two-mode skill (analyse/edit) that reads the embedded schema, proposes config values from project tree analysis, or applies targeted edits to `doccraft.json` in place.
- `doccraft-update-skill`: Silent-by-default update skill that reads the version stamp, fetches `npx doccraft@latest llm`, filters migrations, and runs update (with gate on approval if migration entries apply).

### Modified Capabilities

- `config-loader`: YAML loader removed; JSON loader added. `doccraft update`'s surgical version-stamp edit added.

## Impact

- `src/utils/skills.ts` — YAML loader replaced by JSON loader; `{{DOCS_DIR}}` substitution ported to JSON context.
- `src/commands/init.ts` — scaffold writes `doccraft.json` instead of `doccraft.yaml`.
- `src/commands/update.ts` — adds surgical `version` + `$schema` URL rewrite.
- `src/cli/index.ts` — wires new `doccraft llm` command.
- New `src/commands/llm.ts` — implements `doccraft llm`.
- New `src/utils/config-schema.ts` — single TS source for JSON Schema.
- Build pipeline — emits `schema/doccraft.schema.json`; substitutes `{{DOCCRAFT_CONFIG_SCHEMA}}` and `{{DOCCRAFT_VERSION}}`.
- New `templates/skills/doccraft-config/SKILL.md` and `templates/skills/doccraft-update/SKILL.md`.
- `doccraft.yaml` removed; `doccraft.json` added (dogfood migration).
- `README.md`, `CLAUDE.md` — documentation updates.
- All existing tests touching config path/format need updates.
