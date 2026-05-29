## ADDED Requirements

### Requirement: doccraft.json supports an optional extensions array
The schema for `doccraft.json` SHALL accept an optional `extensions` array. Each element SHALL be an object with a required `path` field (string, project-root-relative). The field SHALL be omittable; its absence SHALL remain a valid configuration. The complete behavioural contract for how the array drives bake-time injection and scaffolding is defined in the `extensions` capability spec.

#### Scenario: Schema accepts extensions array
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** `extensions` is set to `[{"path": "./docs/.doccraft/extensions/business"}]`
- **THEN** validation passes

#### Scenario: Schema accepts absent extensions field
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** the `extensions` field is not present
- **THEN** validation passes

#### Scenario: Schema rejects non-array extensions value
- **WHEN** `doccraft.json` is validated against the published schema
- **AND** `extensions` is an object, string, or number
- **THEN** validation fails with a clear schema error referencing the expected array type

### Requirement: extensions field carries human-readable description and example
The schema definition for `extensions` SHALL include a non-empty `description` and at least one `examples` entry showing a typical extension path (for example `./docs/.doccraft/extensions/business`).

#### Scenario: IDE tooling surfaces description on hover
- **WHEN** a developer hovers over `extensions` in an IDE that consumes the schema
- **THEN** the description text appears in the hover tooltip
- **THEN** the example entry appears in autocomplete suggestions

## REMOVED Requirements

### Requirement: doccraft.json supports an optional story.modelHints field
**Reason**: ADR 013 replaces all bespoke opt-in plumbing with a single extension framework. The `story.modelHints` config field, the auto-seed of `templates/docs/reference/model-hints.md`, and the `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder are all removed in favour of an extension that audio-stage carries in its own repo (manifest with `injects[]` targeting `story.body.sections` or `story.instructions`, plus a `scaffold[]` entry seeding the registry markdown).
**Migration**: Audio-stage authors `docs/.doccraft/extensions/model-hints/extension.yaml` with the model-hints fragment and registry scaffold, then adds the path to `doccraft.json.extensions[]`. Audio-stage removes the now-obsolete `story.modelHints` key from its `doccraft.json` in the same change. No tooling automates the migration; it is a one-shot manual step.

### Requirement: story.modelHints field carries human-readable description and examples
**Reason**: Removed alongside the parent field. No replacement; extensions self-document via their own fragments.
**Migration**: None required. The audio-stage extension's `extension.yaml` may use its own `name` and `version` fields for self-description.

### Requirement: Default scaffold sets story.modelHints
**Reason**: New projects scaffolded by `doccraft init` no longer get the field pre-set or the registry file copied. The bundled `templates/docs/reference/model-hints.md` is no longer auto-seeded by core.
**Migration**: Audio-stage's `model-hints` extension declares its own scaffold for the registry markdown. New projects that want the same behaviour copy the audio-stage extension as a starting point. The bundled `templates/docs/reference/model-hints.md` file MAY remain in the repo as a reference until removed by a follow-up template-refresh change.

### Requirement: Init persists design feature selection
**Reason**: ADR 013 removes the `features[]` array entirely. The `--features` flag on `doccraft init` is removed; designer-skills setup is no longer doccraft's concern (audio-stage wires it via its own scripts).
**Migration**: Audio-stage removes `"design"` from any existing `doccraft.json.features` array. The `features` key itself is removed from the schema. Designer-skills install is invoked by audio-stage tooling outside doccraft.
