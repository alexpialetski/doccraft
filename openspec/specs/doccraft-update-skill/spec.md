## ADDED Requirements

### Requirement: doccraft-update skill exists in templates and is installed
A skill named `doccraft-update` SHALL exist at `templates/skills/doccraft-update/SKILL.md`. It SHALL be installed into `.claude/skills/` by `runInit` and `runUpdate`. It SHALL be authored using the `skill-creator` skill conventions.

#### Scenario: Skill file is present after init
- **WHEN** `doccraft init` completes
- **THEN** `.claude/skills/doccraft-update/SKILL.md` exists in the target directory

### Requirement: Skill reads version from doccraft.json and fetches latest manifest
The skill SHALL read the `"version"` field from `doccraft.json` at the project root, then invoke `npx doccraft@latest llm` once to retrieve the current manifest. The skill SHALL treat the manifest as the authoritative source of migration information.

#### Scenario: Skill reads version stamp
- **WHEN** the skill is invoked and `doccraft.json` exists
- **THEN** the skill reads `version` from the file before making any npx call

#### Scenario: Skill fetches manifest via npx
- **WHEN** the skill is invoked
- **THEN** it runs `npx doccraft@latest llm` exactly once and parses the JSON output

### Requirement: Dominant path — silent update when no migration entries apply
When the manifest's `migrations` array contains no entry covering the range from the local version to the latest version, the skill SHALL run `npx doccraft@latest update` and bump the `version` stamp in `doccraft.json` without prompting the user. It SHALL report what happened after the fact.

#### Scenario: No migration entries — silent update
- **WHEN** the fetched manifest has no `migrations` entries covering the local-to-latest range
- **THEN** the skill runs `npx doccraft@latest update` without asking for approval
- **THEN** the skill bumps `"version"` in `doccraft.json` to the latest version
- **THEN** the skill reports what was updated after completion

### Requirement: Assisted path — gate on approval when migration entries apply
When the manifest's `migrations` array contains entries covering the range from the local version to the latest version, the skill SHALL summarise the declared steps, present them to the user, and proceed with `npx doccraft@latest update` and version stamp bump only after the user approves.

#### Scenario: Migration entries present — gate on approval
- **WHEN** the fetched manifest has migration entries covering the local-to-latest range
- **THEN** the skill summarises the steps before running any command
- **THEN** the skill waits for user confirmation before proceeding
- **THEN** after approval, it runs `npx doccraft@latest update` and bumps the version stamp

#### Scenario: Skill does not fabricate migration steps
- **WHEN** the manifest contains no migration entries for a given range
- **THEN** the skill does NOT invent or fabricate migration steps

### Requirement: Skill tolerates missing doccraft.json
If `doccraft.json` does not exist, the skill SHALL continue with a best-effort update (treating local version as unknown) and SHALL NOT error out.

#### Scenario: Missing config handled gracefully
- **WHEN** the skill is invoked and `doccraft.json` does not exist
- **THEN** the skill continues without throwing an error
- **THEN** it may warn the user that the version stamp is unknown

### Requirement: LlmManifest declares a migration entry for story.modelHints
The `LlmManifest.migrations` array returned by `doccraft llm` SHALL include exactly one entry whose `from` and `to` ranges bracket the version that introduces `story.modelHints`. The entry SHALL describe the steps required for an existing project to adopt the feature.

#### Scenario: Manifest includes the migration entry
- **WHEN** `doccraft llm` is invoked at the version that introduces `story.modelHints`
- **THEN** `manifest.migrations` contains an entry whose `from` covers prior versions and whose `to` covers this release
- **THEN** the entry's `summary` mentions per-story model hints
- **THEN** the entry's `steps` contains an action to add `story.modelHints` to `doccraft.json`
- **THEN** the entry's `steps` contains an action to create the registry file from the bundled neutral template
- **THEN** the entry's `steps` contains an optional action to invoke `doccraft-config` for tailoring

#### Scenario: Subsequent versions do not re-emit the entry
- **WHEN** `doccraft llm` is invoked at a version newer than the introducing release
- **AND** the `from` range of the model-hints migration entry no longer brackets the local version
- **THEN** `doccraft-update`'s manifest filtering excludes the entry from the user-facing summary

### Requirement: doccraft update creates the registry file when the migration is approved
When the user approves the model-hints migration entry during `doccraft update`, the update SHALL ensure the file at the configured `story.modelHints` path exists. If the file is absent, doccraft SHALL create it from the bundled `templates/docs/reference/model-hints.md`. If the file is present, doccraft SHALL leave it untouched.

#### Scenario: Migration approved, file absent
- **WHEN** `doccraft update` runs and the user approves the model-hints migration entry
- **AND** the path resolved from `doccraft.json.story.modelHints` does not exist
- **THEN** doccraft creates the file from the bundled template

#### Scenario: Migration approved, file already present
- **WHEN** `doccraft update` runs and the user approves the model-hints migration entry
- **AND** a file already exists at the configured path
- **THEN** the existing file is left unchanged

#### Scenario: Migration rejected
- **WHEN** `doccraft update` runs and the user rejects the migration entry
- **THEN** doccraft does not modify `doccraft.json` for the model-hints field
- **THEN** doccraft does not create or modify any registry file

### Requirement: doccraft update does not prompt outside the manifest channel for model hints
`doccraft update` SHALL NOT introduce any interactive prompt about model hints outside the existing manifest-driven approval flow.

#### Scenario: No additional prompts during update
- **WHEN** `doccraft update` runs in any environment (interactive or CI)
- **THEN** the only model-hints-related interaction is the existing manifest approval gate
- **THEN** no separate prompt about model hints is shown
