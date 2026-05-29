## ADDED Requirements

### Requirement: doccraft.json supports an optional packages array
The schema for `doccraft.json` SHALL accept an optional `packages` array. Each element SHALL be an object with a required `path` field (string, project-root-relative). The field SHALL be omittable; its absence SHALL remain a valid configuration. The complete behavioural contract for how the array drives per-package scaffolding and the baked package-list block is defined in the `monorepo-packages` capability spec.

#### Scenario: Schema accepts packages array
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** `packages` is set to `[{"path": "packages/audio-engine"}]`
- **THEN** validation passes

#### Scenario: Schema accepts absent packages field
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** the `packages` field is not present
- **THEN** validation passes

#### Scenario: Schema rejects non-array packages value
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** `packages` is an object, string, or number
- **THEN** validation fails with a clear schema error referencing the expected array type

### Requirement: packages field carries human-readable description and example
The schema definition for `packages` SHALL include a non-empty `description` and at least one `examples` entry showing a typical monorepo package path (for example `packages/audio-engine`).

#### Scenario: IDE tooling surfaces description on hover
- **WHEN** a developer hovers over `packages` in an IDE that consumes the schema
- **THEN** the description text appears in the hover tooltip
- **THEN** the example entry appears in autocomplete suggestions
