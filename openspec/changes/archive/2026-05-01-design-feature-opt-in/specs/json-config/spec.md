## MODIFIED Requirements

### Requirement: Scaffolded config is doccraft.json with schema and version keys
`doccraft init` SHALL write a `doccraft.json` file at the project root (not
`doccraft.yaml`). The file SHALL contain `"$schema"`, `"version"`, and `"_hint"`
as its first three keys in that order, followed by `"docsDir"` and the
remaining skill-vocabulary keys. When `doccraft init` is run with
`--features design`, the resulting `doccraft.json` SHALL include `"design"` in
the `features` array so future `doccraft update` runs can replay design setup.

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
