## ADDED Requirements

### Requirement: doccraft-config skill exists in templates and is installed
A skill named `doccraft-config` SHALL exist at `templates/skills/doccraft-config/SKILL.md`. It SHALL be installed into `.claude/skills/` by `runInit` and `runUpdate`, alongside the existing four skills. It SHALL be authored using the `skill-creator` skill conventions.

#### Scenario: Skill file is present after init
- **WHEN** `doccraft init` completes
- **THEN** `.claude/skills/doccraft-config/SKILL.md` exists in the target directory

#### Scenario: Skill file is updated by update
- **WHEN** `doccraft update` completes
- **THEN** `.claude/skills/doccraft-config/SKILL.md` is written (or refreshed) in the target directory

### Requirement: Skill template contains embedded JSON Schema via placeholder substitution
`templates/skills/doccraft-config/SKILL.md` SHALL contain a `{{DOCCRAFT_CONFIG_SCHEMA}}` placeholder. At install time, `installDoccraftSkills` SHALL replace it with the JSON Schema from `schema/doccraft.schema.json` inside the package. The installed skill body SHALL contain the literal schema JSON, not the placeholder.

#### Scenario: Placeholder absent in installed skill
- **WHEN** `doccraft init` or `doccraft update` completes
- **THEN** the installed `.claude/skills/doccraft-config/SKILL.md` contains no occurrence of `{{DOCCRAFT_CONFIG_SCHEMA}}`
- **THEN** the installed skill body contains the `"$schema"` or `"type"` key from the schema JSON

### Requirement: Skill supports analyse mode — propose config values from project tree
In analyse mode the skill SHALL read the project tree (directory structure, file names, conventional-commit scopes if present), propose values for `story.areas`, `story.slices`, `story.themes`, `story.id.tiers`, `queueAudit.scale`, and `sessionWrap.capture`, explain its reasoning, and apply the proposed values to `doccraft.json` only after user approval.

#### Scenario: Analyse mode proposes and gates on approval
- **WHEN** the user invokes the skill without specifying a field to edit
- **THEN** the skill reads the project structure
- **THEN** the skill proposes values with explanations before writing any file
- **THEN** the skill writes `doccraft.json` only after the user approves

### Requirement: Skill supports edit mode — targeted edits with schema validation
In edit mode the skill SHALL accept a user-stated change (e.g. "add area:telemetry"), validate the proposed new value against the embedded schema, and apply it to `doccraft.json` in place. It SHALL NOT call `npx doccraft@latest` — the embedded schema is authoritative.

#### Scenario: Edit mode validates against embedded schema
- **WHEN** the user asks to change a config field to an invalid value
- **THEN** the skill reports the schema violation and does not write the file

#### Scenario: Edit mode applies valid change in place
- **WHEN** the user asks to change a config field to a valid value
- **THEN** the skill writes the updated value to `doccraft.json`
- **THEN** no other fields or formatting in `doccraft.json` are altered beyond the requested change

### Requirement: Skill tolerates missing doccraft.json via in-skill defaults
If `doccraft.json` does not exist at the project root, the skill SHALL proceed using its built-in defaults and SHALL NOT error out.

#### Scenario: Missing config uses defaults
- **WHEN** the skill is invoked and `doccraft.json` does not exist
- **THEN** the skill continues without throwing an error
- **THEN** it may offer to create the file or use defaults

### Requirement: doccraft-config SKILL.md documents the model-hints registry
The rendered `doccraft-config` SKILL.md SHALL include a section titled "Model hints registry" that documents the `story.modelHints` field and the project-owned markdown file it points at.

#### Scenario: Skill body contains the registry section
- **WHEN** `doccraft init` or `doccraft update` writes the `doccraft-config` SKILL.md
- **THEN** the rendered file contains a section whose heading is "Model hints registry" or equivalent
- **THEN** the section explains that `story.modelHints` points at a project-owned markdown file
- **THEN** the section names the recommended file structure (available models, optional phases and roles, decision rules, optional per-story mapping) without enforcing it

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
