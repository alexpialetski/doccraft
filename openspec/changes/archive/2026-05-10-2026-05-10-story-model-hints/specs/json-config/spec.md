## ADDED Requirements

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
