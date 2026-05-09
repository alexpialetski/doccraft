## ADDED Requirements

### Requirement: doccraft-story SKILL.md activates a model-hints integration block when configured
The rendered `doccraft-story` SKILL.md SHALL include a "Model hints" integration block iff `doccraft.json.story.modelHints` is a non-empty string at the time of installation or update. When the field is absent or empty, the SKILL.md SHALL be byte-identical to the variant produced for projects that did not opt in.

The integration block SHALL:

1. Cite the registry file path verbatim from `doccraft.json.story.modelHints` (with `{{DOCS_DIR}}` substituted as needed).
2. Instruct the skill to read the registry before authoring or editing a story.
3. Instruct the skill to **append plain markdown at the end of the story's Notes** — after other Notes content, normal sentences only.
4. Make explicit that the registry content is project-defined, not doccraft-defined.

#### Scenario: Block rendered when modelHints is set
- **WHEN** `doccraft init` or `doccraft update` runs against a config containing `story.modelHints: "docs/reference/model-hints.md"`
- **THEN** the installed `.claude/skills/doccraft-story/SKILL.md` contains a "Model hints" section
- **THEN** the section references the path `docs/reference/model-hints.md` literally
- **THEN** the section instructs the skill to read the registry and append model guidance as plain markdown **at the end of Notes**

#### Scenario: Block omitted when modelHints is unset
- **WHEN** `doccraft init` or `doccraft update` runs against a config without `story.modelHints`
- **THEN** the installed `.claude/skills/doccraft-story/SKILL.md` contains no "Model hints" section
- **THEN** the installed file contains no `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder
- **THEN** the file contains no extraneous blank lines or whitespace artefacts where the block would have been rendered

#### Scenario: Block omitted when modelHints is an empty string
- **WHEN** the config contains `story.modelHints: ""`
- **THEN** the rendered SKILL.md is identical to the variant produced when the field is absent

### Requirement: Registry file content is project-owned and unvalidated by doccraft
Doccraft SHALL NOT validate the structure or wording of the file referenced by `story.modelHints`. The skill block SHALL instruct agents to follow the registry when appending closing Notes prose; doccraft itself SHALL NOT parse registry content at install time or enforce a fixed vocabulary in story files.

#### Scenario: Missing registry file does not fail installation
- **WHEN** `doccraft init` or `doccraft update` runs and the path in `story.modelHints` does not exist on disk
- **THEN** the installation completes successfully
- **THEN** a single warning is emitted to stdout naming the missing file
- **THEN** the integration block is still rendered into the skill (the skill itself will surface the missing file at story-author time)

#### Scenario: Doccraft does not parse or validate registry content
- **WHEN** the registry file exists with arbitrary content
- **THEN** doccraft does not parse it during installation or update
- **THEN** doccraft emits no errors based on its content
