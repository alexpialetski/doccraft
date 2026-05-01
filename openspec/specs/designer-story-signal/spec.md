## ADDED Requirements

### Requirement: Story skill documents designer frontmatter guidance
The `doccraft-story` skill template SHALL document an optional `designer` field
with allowed values `not-needed`, `recommended`, and `required`, including
guidance on when each value should be used.

#### Scenario: Story guidance includes designer values
- **WHEN** a project installs or updates doccraft story skills
- **THEN** the rendered story guidance includes a `designer` field description
- **THEN** the guidance explains all three allowed values and expected usage

### Requirement: Queue audit highlights required design readiness
Queue-audit guidance SHALL advise when stories marked `designer: required` are
present but a `.design/` directory is missing in the project.

#### Scenario: Advisory emitted for missing design artifacts
- **WHEN** queue-audit evaluates stories containing `designer: required`
- **THEN** queue-audit checks whether `.design/` exists
- **THEN** queue-audit emits an advisory note when the directory is absent

### Requirement: Non-design workflows remain unchanged
Projects not using design workflows SHALL continue to run story and queue-audit
flows without forced `designer` metadata.

#### Scenario: Story without designer remains valid
- **WHEN** a story omits the `designer` field
- **THEN** story guidance still considers the story valid
- **THEN** queue-audit treats omission as no required design gate
