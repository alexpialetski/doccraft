## 1. Build pipeline — schema emit and placeholder substitution

- [x] 1.1 Create `src/utils/config-schema.ts` with the full JSON Schema object for `doccraft.json`; every property has `title`, `description`, and `examples`
- [x] 1.2 Add a lint/test rule that fails if any schema property omits `description`
- [x] 1.3 Create `scripts/emit-schema.ts` that writes `schema/doccraft.schema.json` from the TS source
- [x] 1.4 Wire `scripts/emit-schema.ts` into the `build` script in `package.json` (runs after `tsc`)
- [x] 1.5 Add `schema/` to the `files` array in `package.json`
- [x] 1.6 Add `{{DOCCRAFT_VERSION}}` substitution step in the build script that replaces the placeholder in `dist/commands/llm.js` with the value from `package.json`
- [x] 1.7 Write a test asserting that after `build`, no `{{DOCCRAFT_VERSION}}` literal exists in `dist/` and the substituted value matches `package.json` version
- [x] 1.8 Write a test asserting `schema/doccraft.schema.json` content matches the compiled-in schema used by `doccraft llm`

## 2. Config format — YAML → JSON

- [x] 2.1 Rename `templates/doccraft.yaml` → `templates/doccraft.json`; update the scaffold to include `$schema`, `version`, `_hint`, and all existing keys
- [x] 2.2 Update `TEMPLATES_ROOT_CONFIG` constant in `src/utils/skills.ts` to point at `templates/doccraft.json`
- [x] 2.3 Replace the `yaml` import and YAML parser in `readDocsDirFromConfig` with `JSON.parse`; remove the `yaml` npm dependency
- [x] 2.4 Update `scaffoldRootConfigIfMissing` to write `doccraft.json` (not `doccraft.yaml`); inject current package version into `version` and `$schema` fields at scaffold time
- [x] 2.5 Update `MANAGED_HEADER` references to `doccraft.yaml` → `doccraft.json`
- [x] 2.6 Migrate dogfood `doccraft.yaml` → `doccraft.json` at the repo root; verify all skill invocations read the new file
- [x] 2.7 Update existing tests that reference `doccraft.yaml` paths or YAML parsing
- [x] 2.8 Write tests: init writes `doccraft.json`; `readDocsDirFromConfig` reads JSON; missing config returns default `"docs"`

## 3. Surgical version edit in doccraft update

- [x] 3.1 Implement `bumpConfigVersion(projectPath, newVersion)` in `src/utils/skills.ts` using targeted regex replacement on the raw JSON file bytes (update `"version"` value and version segment in `"$schema"` URL)
- [x] 3.2 Call `bumpConfigVersion` from `runUpdate` after the openspec update step
- [x] 3.3 Write tests: before/after diff shows only `version` value and `$schema` version segment change; all other bytes preserved; version and schema URL never drift after update

## 4. doccraft llm command

- [x] 4.1 Create `src/commands/llm.ts` with a `DOCCRAFT_VERSION = '{{DOCCRAFT_VERSION}}'` constant; read `bundledOpenspecVersion` from the installed `@fission-ai/openspec` package
- [x] 4.2 Implement skill-list builder that maps `templates/skills/` dirs to `{name, purpose}` objects (purpose read from skill frontmatter `description` field)
- [x] 4.3 Assemble and emit the full manifest JSON: `version`, `bundledOpenspecVersion`, `schema`, `skills[]`, `migrations: []`
- [x] 4.4 Wire `doccraft llm` as a top-level command in `src/cli/index.ts` (no subcommands, no flags beyond `--help`)
- [x] 4.5 Write tests: manifest parses as valid JSON; `version` is not the placeholder literal; `migrations` is an empty array; `skills` has one entry per `templates/skills/` dir; `schema` has property descriptions

## 5. doccraft-config skill

- [x] 5.1 Author `templates/skills/doccraft-config/SKILL.md` via the `skill-creator` skill; include `{{DOCCRAFT_CONFIG_SCHEMA}}` placeholder where the schema should be inlined; document analyse mode and edit mode
- [x] 5.2 Extend `installSkills` in `src/utils/skills.ts` to substitute `{{DOCCRAFT_CONFIG_SCHEMA}}` with the schema JSON string when installing `doccraft-config`
- [x] 5.3 Write a test: installed `doccraft-config/SKILL.md` contains no `{{DOCCRAFT_CONFIG_SCHEMA}}` literal and contains JSON Schema content

## 6. doccraft-update skill

- [x] 6.1 Author `templates/skills/doccraft-update/SKILL.md` via the `skill-creator` skill; document dominant path (silent) and assisted path (gate on approval); call `npx doccraft@latest llm` once

## 7. Install wiring for new skills

- [x] 7.1 Verify `installDoccraftSkills` installs both `doccraft-config` and `doccraft-update` alongside the existing four skills (auto-discovered via `getAvailableSkills`, so no code change if templates are in place — write a test to confirm both are in the installed list)

## 8. Documentation

- [x] 8.1 Update `README.md`: skills table adds `doccraft-config` and `doccraft-update` rows; install section shows `init` → `doccraft-config` → ongoing `doccraft-update` flow
- [x] 8.2 Update `CLAUDE.md`: skill table, directory map, and setup instructions updated for JSON config and two new skills; mention six-skill ceiling
- [x] 8.3 Update `docs/adr/008-doccraft-yaml-at-root-with-docsdir.md` Status line to point at ADR 009
- [x] 8.4 Update `docs/queue.md` and `docs/backlog.md` to link ADR 009 when the story ships (run `doccraft-queue-audit` after marking P1.5 done)
- [x] 8.5 Mark story P1.5 `status: done` in `docs/stories/p1-assisted-setup-and-migration.md`
