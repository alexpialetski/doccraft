## MODIFIED Requirements

### Requirement: Skill template bodies embed injection markers as HTML comment pairs
Each of the four core skill templates (`doccraft-story`, `doccraft-adr`, `doccraft-queue-audit`, `doccraft-session-wrap`) SHALL embed injection markers using the form `<!-- doccraft:inject point=<point-name> -->` and `<!-- /doccraft:inject -->` at the points the skill exposes. Markers SHALL be paired (open + close) at the same indentation level. A skill template SHALL include each marker exactly once. Templates MAY ALSO embed at most one `<!-- doccraft:packages --> ... <!-- /doccraft:packages -->` marker pair per the `monorepo-packages` capability; this second directive does not affect the injection-point taxonomy or the inject-fragment processing.

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

#### Scenario: Inject markers coexist with at most one packages directive marker
- **WHEN** a template contains both inject markers and a `<!-- doccraft:packages -->` marker
- **THEN** both marker types are processed independently by the marker parser
- **THEN** the presence of the packages marker does not change the count requirement on inject markers

### Requirement: Baker concatenates fragments in extensions[] declaration order
At `doccraft update`, for each `(skill, point)` pair, the baker SHALL find every `injects[]` entry targeting that pair across all enabled extensions, read each `fragment` file, and replace the marker region (open marker through close marker, inclusive) with the concatenated fragment bodies. Fragments SHALL be concatenated in the order their parent extension appears in `doccraft.json.extensions`. A single blank line SHALL separate consecutive fragment bodies. The baker SHALL dispatch on the directive name captured between `doccraft:` and the next whitespace or `-->`, processing `doccraft:inject` markers through this concatenation rule and delegating `doccraft:packages` markers to the packages renderer defined in the `monorepo-packages` capability.

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

#### Scenario: Unknown directive name aborts update
- **WHEN** a template contains a `<!-- doccraft:<name> -->` marker where `<name>` is neither `inject` nor `packages`
- **THEN** `doccraft update` exits non-zero
- **THEN** the error message names the affected skill and the unknown directive
