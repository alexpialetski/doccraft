## ADDED Requirements

### Requirement: Scaffolded config is doccraft.json with schema and version keys
`doccraft init` SHALL write a `doccraft.json` file at the project root (not `doccraft.yaml`). The file SHALL contain `"$schema"`, `"version"`, and `"_hint"` as its first three keys in that order, followed by `"docsDir"` and the remaining skill-vocabulary keys. When `doccraft init` is run with `--features design`, the resulting `doccraft.json` SHALL include `"design"` in the `features` array so future `doccraft update` runs can replay design setup.

#### Scenario: Init writes doccraft.json
- **WHEN** `doccraft init` is run in a directory that has no existing config file
- **THEN** a `doccraft.json` file exists at the project root
- **THEN** `doccraft.yaml` does NOT exist at the project root

#### Scenario: Scaffolded file has schema pointer
- **WHEN** `doccraft.json` is written by init
- **THEN** the `"$schema"` value is `"https://cdn.jsdelivr.net/npm/doccraft@<version>/schema/doccraft.schema.json"` where `<version>` matches the current package version
- **THEN** the `"version"` value equals the current package version string

#### Scenario: Scaffolded file has _hint key
- **WHEN** `doccraft.json` is written by init
- **THEN** a `"_hint"` key is present naming `doccraft-config` as the authoring skill

#### Scenario: Init persists design feature selection
- **WHEN** `doccraft init --features design` is run
- **THEN** `doccraft.json.features` includes `"design"`
- **THEN** later `doccraft update` runs can rely on persisted features without re-passing flags

#### Scenario: Init does not overwrite existing config
- **WHEN** `doccraft init` is run and `doccraft.json` already exists at the project root
- **THEN** the existing `doccraft.json` is NOT modified

### Requirement: JSON Schema is published inside the npm tarball
The npm tarball SHALL contain a `schema/doccraft.schema.json` file derived from the TypeScript schema source `src/utils/config-schema.ts`. This file SHALL be served by jsDelivr at the URL referenced in scaffolded configs.

#### Scenario: Schema file present in package
- **WHEN** the package is built and packed
- **THEN** `schema/doccraft.schema.json` exists in the tarball
- **THEN** the schema is valid JSON Schema draft-07

#### Scenario: Schema fields carry description
- **WHEN** any property is defined in `src/utils/config-schema.ts`
- **THEN** that property has a non-empty `description` field
- **THEN** the build fails if any schema property omits `description`

### Requirement: Build emits schema and substitutes placeholders
The build pipeline SHALL emit `schema/doccraft.schema.json` from `src/utils/config-schema.ts` and SHALL substitute `{{DOCCRAFT_VERSION}}` with the current package version in the compiled CLI output.

#### Scenario: Schema emit runs with build
- **WHEN** `pnpm run build` completes successfully
- **THEN** `schema/doccraft.schema.json` exists and its content matches the TypeScript source

#### Scenario: Version placeholder substituted
- **WHEN** `pnpm run build` completes successfully
- **THEN** no occurrence of the literal string `{{DOCCRAFT_VERSION}}` exists in `dist/`
- **THEN** the substituted version string matches the `version` field in `package.json`

### Requirement: All three schema consumers derive from the same source
The npm tarball file, the `doccraft llm` manifest output, and the installed `doccraft-config` skill body SHALL all contain the JSON Schema derived from `src/utils/config-schema.ts` and SHALL NOT differ from each other.

#### Scenario: Schema consumers match on build
- **WHEN** `pnpm run build` completes
- **THEN** the schema embedded in the compiled `doccraft llm` output matches `schema/doccraft.schema.json`
- **THEN** the `{{DOCCRAFT_CONFIG_SCHEMA}}` placeholder in `templates/skills/doccraft-config/SKILL.md` is substituted with the same schema content at install time

### Requirement: doccraft.json supports an optional story.modelHints field
The schema for `doccraft.json` SHALL accept an optional `story.modelHints` field whose value is a string interpreted as a file path relative to the project root. The field SHALL be omittable; its absence SHALL remain a valid configuration.

#### Scenario: Schema accepts modelHints as a string
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** `story.modelHints` is set to `"docs/reference/model-hints.md"`
- **THEN** validation passes

#### Scenario: Schema accepts absent modelHints
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** the `story.modelHints` field is not present
- **THEN** validation passes

#### Scenario: Schema rejects non-string modelHints
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** `story.modelHints` is an object, array, or boolean
- **THEN** validation fails with a clear schema error referencing the expected string type

### Requirement: story.modelHints field carries human-readable description and examples
The schema definition for `story.modelHints` SHALL include a non-empty `description` and at least one `examples` entry pointing at a typical project path (for example `docs/reference/model-hints.md`).

#### Scenario: IDE tooling surfaces description on hover
- **WHEN** a developer hovers over `story.modelHints` in an IDE that consumes the schema
- **THEN** the description text appears in the hover tooltip
- **THEN** the example path appears in autocomplete suggestions

### Requirement: Default scaffold sets story.modelHints
The `templates/doccraft.json` shipped with the package SHALL include `story.modelHints: "docs/reference/model-hints.md"` so new projects scaffolded via `doccraft init` have the field pre-set.

#### Scenario: Init scaffolds doccraft.json with modelHints set
- **WHEN** `doccraft init` runs against a project with no existing `doccraft.json`
- **THEN** the written `doccraft.json` contains `story.modelHints: "docs/reference/model-hints.md"`

#### Scenario: Init copies the registry template into place
- **WHEN** `doccraft init` runs against a project with no existing `docs/reference/model-hints.md`
- **THEN** a file is created at that path from the bundled `templates/docs/reference/model-hints.md`

#### Scenario: Init preserves an existing registry file
- **WHEN** `doccraft init` runs against a project that already has a file at the path referenced by `story.modelHints`
- **THEN** the existing file is left unchanged
