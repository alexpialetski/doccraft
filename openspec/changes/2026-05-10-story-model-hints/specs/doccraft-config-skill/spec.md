## ADDED Requirements

### Requirement: doccraft-config SKILL.md documents the model-hints registry
The rendered `doccraft-config` SKILL.md SHALL include a section titled "Model hints registry" that documents the `story.modelHints` field and the project-owned markdown file it points at.

#### Scenario: Skill body contains the registry section
- **WHEN** `doccraft init` or `doccraft update` writes the `doccraft-config` SKILL.md
- **THEN** the rendered file contains a section whose heading is "Model hints registry" or equivalent
- **THEN** the section explains that `story.modelHints` points at a project-owned markdown file
- **THEN** the section names the recommended file structure (Available Models, Label Vocabulary, Decision Rules, optional Per-story Mapping) without enforcing it

### Requirement: doccraft-config skill offers a tailoring flow when the registry matches the bundled starter
The `doccraft-config` SKILL.md SHALL instruct the skill to offer a tailoring flow that walks the user through replacing the neutral starter with the project's actual model ecosystem, but only when the registry file at the configured path appears to match the bundled starter.

#### Scenario: Tailoring offered for the bundled starter
- **WHEN** the user invokes `doccraft-config`
- **AND** `story.modelHints` is set
- **AND** the file at that path matches the bundled starter (heuristic: file size and header match)
- **THEN** the skill offers to walk the user through tailoring the registry

#### Scenario: Tailoring not offered for a custom registry
- **WHEN** the user invokes `doccraft-config`
- **AND** `story.modelHints` is set
- **AND** the file at that path does not match the bundled starter
- **THEN** the skill does not offer the tailoring flow
- **THEN** the skill leaves the file untouched

### Requirement: doccraft-config skill MUST NOT validate registry content
The `doccraft-config` skill SHALL NOT parse or validate the structure of the file at `story.modelHints` beyond checking whether it exists at the configured path.

#### Scenario: Custom registry passes through unchanged
- **WHEN** the registry file contains arbitrary content (sections renamed, sections missing, additional sections added)
- **THEN** `doccraft-config` does not alter the file
- **THEN** `doccraft-config` does not emit warnings or errors based on the file's structure
