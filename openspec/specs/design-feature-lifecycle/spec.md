## ADDED Requirements

### Requirement: Design feature SHALL install upstream designer-skills during init
The CLI SHALL invoke `npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes` from the project root when `doccraft init` is run with `design` among selected features.

#### Scenario: Init with design installs designer-skills
- **WHEN** a user runs `doccraft init --features design`
- **THEN** doccraft executes the designer-skills subprocess in the project root
- **THEN** installed skills are available under `.claude/skills/`

### Requirement: Design feature SHALL reinstall designer-skills on update when persisted
Doccraft SHALL run the same designer-skills subprocess when `doccraft update` executes and `doccraft.json.features` contains `"design"`.

#### Scenario: Update replays installation for persisted feature
- **WHEN** `doccraft.json` contains `"features": ["design"]` and `doccraft update` is run
- **THEN** doccraft executes the designer-skills subprocess
- **THEN** update completes after reporting install success or failure

### Requirement: Subprocess failures include manual fallback guidance
If the designer-skills subprocess exits non-zero, doccraft SHALL present a clear
error that includes the manual fallback command users can run directly.

#### Scenario: Network failure during designer-skills install
- **WHEN** the subprocess cannot install due to network or registry errors
- **THEN** doccraft surfaces a failure message that identifies design skill setup failure
- **THEN** the message includes `npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes`
