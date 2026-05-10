## ADDED Requirements

### Requirement: doccraft update emits a one-time migration hint when modelHints is unset
After completing the version bump and skill render, `doccraft update` SHALL check whether `doccraft.json.story.modelHints` is set. If unset and the version stamp was raised across the version that introduced the field, a single one-line migration hint SHALL be emitted to stdout.

The hint SHALL:

1. Mention that per-story model hints is a new optional feature.
2. Point the user at the `doccraft-config` skill as the recommended way to enable it.
3. Be emitted at most once per project. A marker SHALL be persisted in `doccraft.json` under a namespaced key (for example `_seen.modelHintsHint: true`) so subsequent updates do not re-emit the hint.

#### Scenario: First update after the version landed
- **WHEN** `doccraft update` runs against a project whose previous `doccraft.json.version` predates the model-hints field, has no `story.modelHints` set, and has no `_seen.modelHintsHint` marker
- **THEN** stdout contains the migration hint exactly once
- **THEN** `doccraft.json._seen.modelHintsHint` is set to `true`

#### Scenario: Subsequent update after hint already shown
- **WHEN** `doccraft update` runs against a project that already has `_seen.modelHintsHint: true`
- **THEN** stdout contains no migration hint regardless of whether `story.modelHints` is set

#### Scenario: Hint not shown when modelHints is already set
- **WHEN** `doccraft update` runs against a project whose `doccraft.json.story.modelHints` is a non-empty string
- **THEN** stdout contains no migration hint
- **THEN** `_seen.modelHintsHint` is set to `true` to avoid future emission

### Requirement: doccraft update does not prompt interactively for model hints
`doccraft update` SHALL NOT open an interactive prompt for the model-hints feature. Interactive setup belongs to `doccraft init` and to the `doccraft-config` skill.

#### Scenario: Update runs non-interactively in CI
- **WHEN** `doccraft update` runs in a CI environment without a TTY
- **THEN** no prompt is shown
- **THEN** the migration hint (if applicable) is still emitted to stdout

#### Scenario: Update runs interactively in a developer shell
- **WHEN** `doccraft update` runs interactively
- **THEN** no prompt is shown for model hints
- **THEN** the migration hint is emitted to stdout if the conditions in the previous requirement are met
