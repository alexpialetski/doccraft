## ADDED Requirements

### Requirement: doccraft llm command emits compact JSON manifest
The CLI SHALL expose a top-level `doccraft llm` command with no subcommands and no flags (other than `--help`). Invoking it SHALL write a single compact JSON object to stdout and exit 0.

#### Scenario: Command exists and exits cleanly
- **WHEN** `doccraft llm` is invoked
- **THEN** it writes valid JSON to stdout
- **THEN** it exits with code 0

#### Scenario: Command accepts no flags
- **WHEN** `doccraft llm --unknown-flag` is invoked
- **THEN** it prints an error and exits with a non-zero code

### Requirement: Manifest contains version and bundledOpenspecVersion
The manifest object SHALL contain a `"version"` field set to the doccraft package version (substituted at build time) and a `"bundledOpenspecVersion"` field set to the version of the bundled `@fission-ai/openspec` dependency.

#### Scenario: version field is present and correct
- **WHEN** `doccraft llm` output is parsed
- **THEN** `output.version` is a non-empty semver string matching the installed doccraft version

#### Scenario: bundledOpenspecVersion is present
- **WHEN** `doccraft llm` output is parsed
- **THEN** `output.bundledOpenspecVersion` is a non-empty string

### Requirement: Manifest contains the full JSON Schema
The manifest SHALL contain a `"schema"` field that is the JSON Schema object for `doccraft.json`, derived from the same source as `schema/doccraft.schema.json` in the npm tarball.

#### Scenario: schema field is a valid JSON Schema object
- **WHEN** `doccraft llm` output is parsed
- **THEN** `output.schema` is a non-null object
- **THEN** `output.schema.$schema` or `output.schema.type` is present (valid JSON Schema)

### Requirement: Manifest contains skills array with name and purpose
The manifest SHALL contain a `"skills"` array where each element has exactly two fields: `"name"` (the skill directory name) and `"purpose"` (a single-sentence description). Full SKILL.md body SHALL NOT appear.

#### Scenario: skills array has one entry per installed doccraft skill
- **WHEN** `doccraft llm` output is parsed
- **THEN** `output.skills` is an array with one entry per skill in `templates/skills/`
- **THEN** each entry has a `name` string and a `purpose` string of one sentence

#### Scenario: skills entries do not include SKILL.md body
- **WHEN** `doccraft llm` output is parsed
- **THEN** no `output.skills[*].body` or `output.skills[*].content` field exists

### Requirement: Manifest contains migrations array, sparse by design
The manifest SHALL contain a `"migrations"` array. Each entry SHALL have `"from"`, `"to"`, `"summary"`, and `"steps"` fields. The array SHALL be empty when no release requires user-assisted edits.

#### Scenario: migrations is an array
- **WHEN** `doccraft llm` output is parsed
- **THEN** `output.migrations` is an array (may be empty)

#### Scenario: initial manifest ships with empty migrations
- **WHEN** `doccraft llm` is run on the first release implementing this feature
- **THEN** `output.migrations` has length 0

#### Scenario: migration entry shape is correct when present
- **WHEN** `output.migrations` contains entries
- **THEN** each entry has `from` (string), `to` (string), `summary` (string), and `steps` (string array)

### Requirement: Manifest shape is stable; breaking changes require a migration entry
Any breaking change to the manifest shape (removing a field, renaming a field, changing a field's type) SHALL ship with a corresponding entry in the `migrations` array of that release.

#### Scenario: Field removal ships with migration entry
- **WHEN** a release removes a field from the manifest
- **THEN** a migration entry documenting the change is present in that release's manifest
