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
