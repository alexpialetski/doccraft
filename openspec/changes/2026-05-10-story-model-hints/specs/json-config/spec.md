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
