## ADDED Requirements

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
- **THEN** the migration log records that the file was created

#### Scenario: Migration approved, file already present
- **WHEN** `doccraft update` runs and the user approves the model-hints migration entry
- **AND** a file already exists at the configured path
- **THEN** the existing file is left unchanged
- **THEN** the migration log records that the file was preserved

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
