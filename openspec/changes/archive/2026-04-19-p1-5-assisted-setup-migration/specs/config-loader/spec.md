## MODIFIED Requirements

### Requirement: Config file is doccraft.json (JSON format, not YAML)
The CLI SHALL read project configuration from `doccraft.json` at the project root using `JSON.parse`. The `yaml` npm package SHALL be removed; no YAML config loader SHALL remain in the codebase. The `doccraft.yaml` template SHALL be replaced by `templates/doccraft.json`.

#### Scenario: JSON config is read correctly
- **WHEN** `doccraft.json` exists at the project root
- **THEN** `readDocsDirFromConfig` reads `docsDir` from it via JSON.parse
- **THEN** the resolved `docsDir` value is used for `{{DOCS_DIR}}` substitution in skill files

#### Scenario: Missing config falls back to default
- **WHEN** `doccraft.json` does not exist at the project root
- **THEN** `readDocsDirFromConfig` returns `"docs"` as the default
- **THEN** no error is thrown

#### Scenario: YAML file is not read
- **WHEN** only `doccraft.yaml` exists (no `doccraft.json`)
- **THEN** `readDocsDirFromConfig` returns the default (`"docs"`) — it does NOT fall back to parsing YAML

### Requirement: doccraft update performs surgical version and schema URL edit
`doccraft update` SHALL update the `"version"` value and the version segment of the `"$schema"` URL in `doccraft.json` in a single pass using targeted string replacement. It SHALL NOT parse, mutate, and re-serialize the full JSON (which would reformat the file). Every byte of the file other than those two string values SHALL be preserved.

#### Scenario: Version and schema URL are updated
- **WHEN** `doccraft update` completes on a project with `doccraft.json`
- **THEN** `doccraft.json`'s `"version"` value equals the new doccraft version
- **THEN** `doccraft.json`'s `"$schema"` URL contains the new version in the jsDelivr path

#### Scenario: No other bytes change
- **WHEN** `doccraft update` runs on a `doccraft.json` with custom user values
- **THEN** all keys and values other than `"version"` and the version segment of `"$schema"` are unchanged
- **THEN** key ordering and whitespace are preserved

#### Scenario: Version and schema URL never drift
- **WHEN** `doccraft update` completes
- **THEN** the version segment in `"$schema"` matches the `"version"` value exactly
