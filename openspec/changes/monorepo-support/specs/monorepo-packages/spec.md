## ADDED Requirements

### Requirement: doccraft.json declares package roots as an ordered array
The `doccraft.json` schema SHALL accept an optional `packages` array. Each element SHALL be an object with a required `path` string field interpreted relative to the project root. Declaration order SHALL be the order in which packages appear in the rendered package-list block baked into skill bodies. Absence of the field, or an empty array, SHALL produce baked skill bodies byte-identical to those produced when the `doccraft:packages` directive markers are absent from the template entirely.

#### Scenario: Schema accepts packages array
- **WHEN** `doccraft.json` contains `"packages": [{"path": "packages/audio-engine"}]`
- **THEN** schema validation passes
- **THEN** the path is interpreted relative to the project root

#### Scenario: Schema rejects malformed package entries
- **WHEN** `doccraft.json` contains `"packages": [{}]` or `"packages": ["string"]` or `"packages": [{"path": 42}]`
- **THEN** schema validation fails with a clear message naming the missing or wrong-typed field

#### Scenario: Absent packages field preserves single-root behaviour
- **WHEN** `doccraft.json` omits the `packages` key
- **THEN** schema validation passes
- **THEN** `doccraft update` produces baked skills with no rendered package-list block
- **THEN** no `<package>/docs/` scaffold writes occur

#### Scenario: Empty packages array is identical to absent field
- **WHEN** `doccraft.json` contains `"packages": []`
- **THEN** the baked output of every core skill is byte-identical to the output produced when the `packages` key is absent

### Requirement: Package slugs are derived from the last path segment and must be unique
Each declared package entry SHALL have a slug equal to `path.basename(entry.path)`. Slugs SHALL be unique across the manifest. Duplicate slugs (regardless of differing parent paths) SHALL cause `doccraft update` to abort with an error naming both colliding entries.

#### Scenario: Distinct slugs are accepted
- **WHEN** `packages` contains entries with paths `packages/audio-engine` and `packages/ui-shell`
- **THEN** the load succeeds with slugs `audio-engine` and `ui-shell`

#### Scenario: Duplicate slugs across different parent paths abort update
- **WHEN** `packages` contains entries with paths `packages/a/foo` and `services/b/foo`
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names slug `foo` and both colliding paths

### Requirement: doccraft:packages directive renders a package-list block when packages are declared
Skill template bodies MAY embed a `<!-- doccraft:packages -->` ... `<!-- /doccraft:packages -->` marker pair. At `doccraft update`, when `packages[]` is non-empty, the marker region SHALL be replaced with a block that names each declared package by slug and renders the path to its `<docsDir>/` root. The block SHALL include the resolution rule: namespaced ids of the form `<slug>/STR-NNNN` and `<slug>/NNN-slug.md` resolve under the matching package root; unprefixed ids resolve under the project-root `<docsDir>/`. When `packages[]` is empty or absent, the marker pair (and one trailing newline) SHALL be stripped without leaving whitespace artefacts.

#### Scenario: Marker region is rendered when packages are declared
- **WHEN** `packages` contains two entries (`packages/audio-engine`, `packages/ui-shell`) and a template embeds the marker
- **THEN** the baked skill contains a block listing both slugs and their `<docsDir>/` paths
- **THEN** the block explains namespaced-id resolution
- **THEN** neither the open marker nor the close marker appears in the baked output

#### Scenario: Marker region is stripped when packages are absent
- **WHEN** `packages` is absent and a template embeds the marker
- **THEN** the baked skill contains neither the open marker, the close marker, nor extra blank lines where they were

#### Scenario: Marker region is stripped when packages array is empty
- **WHEN** `packages: []` is present and a template embeds the marker
- **THEN** the baked skill is byte-identical to the version produced with `packages` absent

### Requirement: doccraft:packages directive may appear at most once per template
A skill template SHALL include the `<!-- doccraft:packages -->` marker at most once. Duplicate markers SHALL cause `doccraft update` to abort with an error that names the affected skill template.

#### Scenario: Two packages markers in one template abort update
- **WHEN** a skill template contains two `<!-- doccraft:packages -->` marker pairs
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names the skill and indicates the duplicate-marker reason

### Requirement: Marker parser dispatches on directive name
The marker parser SHALL recognise multiple directive types (`doccraft:inject`, `doccraft:packages`) using the directive name captured between `doccraft:` and the next whitespace or `-->`. The parser SHALL reject any unknown directive name with a clear error at update time.

#### Scenario: Inject directive is processed by the inject branch
- **WHEN** a template contains `<!-- doccraft:inject point=story.instructions --> ... <!-- /doccraft:inject -->`
- **THEN** the marker region is processed by the existing inject behaviour from the extension framework

#### Scenario: Packages directive is processed by the packages branch
- **WHEN** a template contains `<!-- doccraft:packages --> ... <!-- /doccraft:packages -->`
- **THEN** the marker region is processed by the packages-list renderer

#### Scenario: Unknown directive aborts update
- **WHEN** a template contains `<!-- doccraft:pakcages --> ... <!-- /doccraft:pakcages -->` (typo) or any unknown directive name
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names the skill and the unknown directive

### Requirement: Bake output remains deterministic when packages are declared
Given identical inputs — `doccraft.json` (including the same `packages` order), template skills, extension manifests, and fragment files — the baker SHALL produce byte-identical output in `.claude/skills/` across consecutive runs.

#### Scenario: Repeated update with packages produces no diff
- **WHEN** `doccraft update` is run twice in succession with no intervening changes and `packages` is non-empty
- **THEN** every file under `.claude/skills/` is byte-identical between the two runs

### Requirement: Per-package docs scaffold runs for each declared package
At `doccraft update`, for each entry in `packages[]`, the install pipeline SHALL walk the bundled `templates/docs/` tree and write any missing files under `<entry.path>/<docsDir>/...`. Files that already exist at the target SHALL be preserved verbatim, matching the never-overwrite semantics used for the root scaffold and the extension scaffold. The per-package scaffold SHALL run after the root scaffold and the extension scaffold so that any path collisions defer to pre-existing content.

#### Scenario: New package directory is fully scaffolded
- **WHEN** `packages` includes a path that has no existing `<docsDir>/` directory
- **THEN** each file under `templates/docs/` is written to the corresponding path beneath `<entry.path>/<docsDir>/`
- **THEN** the user is informed of the count and paths of files created

#### Scenario: Existing per-package files are preserved
- **WHEN** a package already has a file at `<entry.path>/<docsDir>/queue.md` and the scaffold runs
- **THEN** the existing file is left unchanged
- **THEN** no error is emitted

#### Scenario: Package directory may not exist before scaffold
- **WHEN** `packages` includes a path whose directory has not yet been created on disk
- **THEN** the scaffold creates the directory tree and writes the bundled files into it

### Requirement: Existing single-root behaviour is preserved when packages is empty or absent
Projects with `packages: []` or no `packages` key in `doccraft.json` SHALL observe behaviour byte-identical to doccraft 4.0.0 with respect to scaffold output, baked skill bodies (other than templates containing the optional `<!-- doccraft:packages -->` marker, which strips cleanly), and install pipeline log output.

#### Scenario: Pre-4.1.0 install paths land in the same shape
- **WHEN** a project upgrades from 4.0.0 to 4.1.0 without adding `packages` to `doccraft.json`
- **AND** the same `doccraft update` command is run
- **THEN** the resulting `.claude/skills/` and `docs/` trees match the 4.0.0 install file-for-file
- **THEN** the only new file on disk is the per-skill marker region collapse (if any template added the new marker)

### Requirement: Skill bodies document the namespaced-id convention and package-context resolution rules
The rendered bodies of `doccraft-story`, `doccraft-adr`, and `doccraft-queue-audit` SHALL include prose that:

1. Names the form `<slug>/STR-NNNN` (and `<slug>/NNN-slug.md` for ADRs) and the meaning of an unprefixed id (root scope).
2. States the package-context resolution rule: explicit `package:` arg in the user request wins; otherwise infer from the active file's path under a declared package root; otherwise default to root.
3. (For `doccraft-queue-audit` only) describes cross-scope `depends_on` handling, per-package queue + backlog reconciliation, and an aggregate view when the user asks "what's unblocked anywhere".

The rendered body of `doccraft-session-wrap` SHALL include a brief note that artifact proposals route to the package whose body the conversation most clearly referenced.

#### Scenario: doccraft-story body explains the namespaced-id convention
- **WHEN** the bundled `doccraft-story` template is baked with `packages` non-empty
- **THEN** the baked body contains the form `<slug>/STR-NNNN`
- **THEN** the baked body explains the explicit-arg / active-file / root precedence

#### Scenario: doccraft-queue-audit body describes cross-scope handling
- **WHEN** the bundled `doccraft-queue-audit` template is baked with `packages` non-empty
- **THEN** the baked body explains how cross-scope `depends_on` is resolved
- **THEN** the baked body documents the aggregate-view behaviour
