## ADDED Requirements

### Requirement: doccraft.json declares extensions as an ordered array of directory paths
The `doccraft.json` schema SHALL accept an optional `extensions` array. Each element SHALL be an object with a required `path` string field, interpreted relative to the project root. Declaration order SHALL be semantically significant — it controls fragment concatenation order at bake time. Absence of the field SHALL be valid and SHALL produce baked skills identical to the case `extensions: []`.

#### Scenario: Schema accepts extensions array
- **WHEN** `doccraft.json` contains `"extensions": [{"path": "./docs/.doccraft/extensions/business"}]`
- **THEN** schema validation passes
- **THEN** the path is interpreted relative to the project root

#### Scenario: Schema rejects malformed extension entries
- **WHEN** `doccraft.json` contains `"extensions": [{}]` or `"extensions": ["string"]` or `"extensions": [{"path": 42}]`
- **THEN** schema validation fails with a clear message naming the missing or wrong-typed field

#### Scenario: Absent extensions field is valid
- **WHEN** `doccraft.json` omits the `extensions` key entirely
- **THEN** schema validation passes
- **THEN** `doccraft update` produces baked skills with no injected content and no scaffold writes

### Requirement: Each extension directory ships an extension.yaml manifest
Every directory listed in `doccraft.json.extensions[].path` SHALL contain an `extension.yaml` at its root. The manifest SHALL have a required `name` string field. It SHALL accept an optional `version` string (informational only, not enforced). It SHALL accept optional `injects` and `scaffold` arrays. Manifest absence or invalid YAML SHALL cause `doccraft update` to abort with a specific error.

#### Scenario: Missing manifest aborts update
- **WHEN** an extension path exists but contains no `extension.yaml`
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names the extension path and states that `extension.yaml` is missing

#### Scenario: Missing required name field aborts update
- **WHEN** an `extension.yaml` omits the `name` field
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message identifies the extension by path and names the missing field

#### Scenario: Both injects and scaffold may be omitted
- **WHEN** an `extension.yaml` declares only `name` (no `injects`, no `scaffold`)
- **THEN** the manifest is accepted as valid
- **THEN** the extension contributes no bake-time output

### Requirement: injects entries declare a target skill, point, and fragment file
Each entry in `extension.yaml.injects[]` SHALL specify three required fields: `skill` (a doccraft skill name), `point` (a member of the enumerated injection-point taxonomy), and `fragment` (a path relative to the extension directory, resolved at update time). Any missing or invalid field SHALL abort `doccraft update`.

#### Scenario: Unknown skill name aborts update
- **WHEN** an `injects[]` entry sets `skill: doccraft-nonexistent`
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message identifies the extension and the unknown skill name

#### Scenario: Unknown injection point aborts update
- **WHEN** an `injects[]` entry sets `point: story.unknown`
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message identifies the extension, the unknown point name, and the list of valid points

#### Scenario: Missing fragment file aborts update
- **WHEN** an `injects[]` entry references a `fragment` path that does not exist
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message identifies the extension and the missing file path

### Requirement: Injection-point taxonomy is fixed and enumerated
The set of valid `point` values SHALL be the fixed list: `story.frontmatter.fields`, `story.body.sections`, `story.instructions`, `adr.frontmatter.fields`, `adr.body.sections`, `adr.instructions`, `queue.instructions`, `queue.artifact-types`, `session-wrap.artifact-types`, `session-wrap.instructions`. Adding a value to the list SHALL be a non-breaking change. Removing a value SHALL be a breaking change. The infrastructure skills `doccraft-config` and `doccraft-update` SHALL NOT have injection points in v1.

#### Scenario: All ten v1 points are accepted
- **WHEN** an `injects[]` entry uses any of the ten enumerated points with a valid skill and existing fragment
- **THEN** the entry validates and the fragment is baked at that point

#### Scenario: Injecting into doccraft-config or doccraft-update is rejected
- **WHEN** an `injects[]` entry sets `skill: doccraft-config` or `skill: doccraft-update`
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names the skill and explains that infrastructure skills do not accept injections

### Requirement: Skill template bodies embed injection markers as HTML comment pairs
Each of the four core skill templates (`doccraft-story`, `doccraft-adr`, `doccraft-queue-audit`, `doccraft-session-wrap`) SHALL embed injection markers using the form `<!-- doccraft:inject point=<point-name> -->` and `<!-- /doccraft:inject -->` at the points the skill exposes. Markers SHALL be paired (open + close) at the same indentation level. A skill template SHALL include each marker exactly once.

#### Scenario: Each core skill embeds markers for all its declared points
- **WHEN** the four core skill templates are inspected
- **THEN** `doccraft-story` embeds markers for `story.frontmatter.fields`, `story.body.sections`, and `story.instructions`
- **THEN** `doccraft-adr` embeds markers for `adr.frontmatter.fields`, `adr.body.sections`, and `adr.instructions`
- **THEN** `doccraft-queue-audit` embeds markers for `queue.instructions` and `queue.artifact-types`
- **THEN** `doccraft-session-wrap` embeds markers for `session-wrap.artifact-types` and `session-wrap.instructions`

#### Scenario: Duplicate markers in a single template are a build error
- **WHEN** a template body contains two open markers for the same point
- **THEN** the build (or test that validates template structure) fails
- **THEN** the failure names the skill and the duplicated point

### Requirement: Baker concatenates fragments in extensions[] declaration order
At `doccraft update`, for each `(skill, point)` pair, the baker SHALL find every `injects[]` entry targeting that pair across all enabled extensions, read each `fragment` file, and replace the marker region (open marker through close marker, inclusive) with the concatenated fragment bodies. Fragments SHALL be concatenated in the order their parent extension appears in `doccraft.json.extensions`. A single blank line SHALL separate consecutive fragment bodies.

#### Scenario: Single fragment replaces marker region
- **WHEN** exactly one extension targets `(doccraft-story, story.instructions)` with fragment content `Be careful.`
- **THEN** the baked `doccraft-story` skill contains `Be careful.` in place of the marker pair
- **THEN** the open and close markers are not present in the baked output

#### Scenario: Multiple fragments concatenate in declaration order
- **WHEN** extension A (declared first) and extension B (declared second) both target `(doccraft-story, story.instructions)` with fragments `From A.` and `From B.` respectively
- **THEN** the baked output contains `From A.` followed by a blank line followed by `From B.` at the marker region

#### Scenario: Empty marker region is stripped without whitespace artefacts
- **WHEN** no extension targets `(doccraft-story, story.instructions)` for a given update run
- **THEN** the baked output contains neither the open marker, the close marker, nor extra blank lines where the markers were

### Requirement: scaffold entries copy source trees into project paths with never-overwrite semantics
Each entry in `extension.yaml.scaffold[]` SHALL specify a `source` path (relative to the extension directory) and a `target` path (relative to the project root). At `doccraft update`, the scaffold step SHALL walk each source tree and copy every file to the corresponding target, creating intermediate directories as needed. Files that already exist at the target SHALL be preserved verbatim. The scaffold step SHALL run AFTER the core `scaffoldDocsIfMissing` step so that core templates take precedence on path collisions.

#### Scenario: New file is copied
- **WHEN** an extension declares `scaffold: [{source: ./scaffold/business, target: docs/business}]` and the project has no `docs/business/` directory
- **THEN** every file under `scaffold/business/` in the extension is copied to the corresponding path under `docs/business/`

#### Scenario: Existing file is preserved
- **WHEN** the target path already contains a file at `docs/business/audience.md`
- **AND** the extension's scaffold source contains a file at the same relative path
- **THEN** the existing file is left unchanged
- **THEN** no error is emitted

#### Scenario: Missing scaffold source aborts update
- **WHEN** a `scaffold[]` entry references a `source` path that does not exist on disk
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names the extension and the missing source path

### Requirement: Baker output is deterministic across runs
Given identical inputs — template skills, extension manifests, fragment files, and `doccraft.json` — the baker SHALL produce byte-identical output in `.claude/skills/` across consecutive runs.

#### Scenario: Repeated update produces no diff
- **WHEN** `doccraft update` is run twice in succession with no intervening changes
- **THEN** every file under `.claude/skills/` is byte-identical between the two runs

### Requirement: Existing one-shot placeholders are unaffected by the extension framework
The `{{DOCS_DIR}}` and `{{DOCCRAFT_CONFIG_SCHEMA}}` placeholders SHALL continue to be substituted by the install pipeline. The extension marker mechanism SHALL NOT interact with them. The `{{BUSINESS_INTEGRATION_BLOCK}}` and `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholders SHALL be removed from all template skill bodies.

#### Scenario: DOCS_DIR substitution still works
- **WHEN** a template body contains `{{DOCS_DIR}}` and the resolved `docsDir` is `docs`
- **THEN** the baked skill contains `docs` in place of `{{DOCS_DIR}}`

#### Scenario: No legacy placeholders remain in templates
- **WHEN** the four core skill templates are inspected
- **THEN** none of them contain `{{BUSINESS_INTEGRATION_BLOCK}}` or `{{MODEL_HINTS_INTEGRATION_BLOCK}}`
