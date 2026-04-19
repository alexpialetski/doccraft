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
