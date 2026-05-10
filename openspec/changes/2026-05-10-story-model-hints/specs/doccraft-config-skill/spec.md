## ADDED Requirements

### Requirement: doccraft init offers an interactive prompt for model hints
When invoked in an interactive (TTY) shell, `doccraft init` SHALL ask the user whether to enable per-story model hints. The prompt SHALL offer three answers: skip, point at an existing file, or scaffold a new registry file from a built-in template.

#### Scenario: User skips the prompt
- **WHEN** `doccraft init` runs interactively and the user selects "skip"
- **THEN** `doccraft.json` is written without a `story.modelHints` field
- **THEN** no registry file is created

#### Scenario: User points at an existing file
- **WHEN** `doccraft init` runs interactively, the user chooses "use existing path", and provides `docs/reference/model-hints.md`
- **THEN** `doccraft.json.story.modelHints` is set to the provided path
- **THEN** if the file does not exist, a warning is printed naming the missing file (init does not fail)

#### Scenario: User scaffolds a new registry file
- **WHEN** `doccraft init` runs interactively, the user chooses "scaffold", and accepts the default path
- **THEN** a new file is created at `docs/reference/model-hints.md` from `templates/docs/reference/model-hints.md`
- **THEN** `doccraft.json.story.modelHints` is set to that path
- **THEN** stdout includes a one-line follow-up instructing the user (or their LLM) to populate the registry from a model description

### Requirement: doccraft init skips the model-hints prompt in non-interactive runs
When `doccraft init` runs without a TTY (e.g. in CI), the model-hints prompt SHALL be skipped silently. `doccraft.json` SHALL be written without a `story.modelHints` field unless the user passed an explicit flag (out of scope for this change).

#### Scenario: CI run produces no prompt
- **WHEN** `doccraft init` runs without a TTY
- **THEN** no model-hints prompt is shown
- **THEN** `doccraft.json` is written without `story.modelHints`
- **THEN** no registry file is created
