## Why

Doccraft currently has no first-class design workflow even though many projects
need a design pass before UI implementation starts. Teams can manually install
designer-skills, but that install is disconnected from `doccraft init/update`
and cannot be signaled in story planning metadata.

## What Changes

- Add a `design` feature to `doccraft.json` so design workflow support is
  opt-in and persisted after initialization.
- Run `npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes`
  as a subprocess during `doccraft init` and `doccraft update` when `design` is
  enabled.
- Add a `designer` story field (`not-needed | recommended | required`) guidance
  to the doccraft story skill template.
- Update queue-audit guidance to emit an advisory when stories require design
  but no `.design/` directory exists.
- Add clear failure messaging with the manual fallback command when the
  subprocess cannot complete.

## Capabilities

### New Capabilities
- `design-feature-lifecycle`: install and refresh designer-skills as part of
  the `doccraft init/update` lifecycle when `design` is enabled.
- `designer-story-signal`: define and surface story-level `designer` guidance
  for planning and queue auditing.

### Modified Capabilities
- `json-config`: allow `"design"` as a valid entry in `doccraft.json.features`
  so feature selection is validated and persisted.

## Impact

- `src/commands/init.ts` and `src/commands/update.ts` gating and lifecycle flow.
- New utility module for subprocess installation (`src/utils/designer-skills.ts`).
- `schema/doccraft-schema.json` feature enum validation.
- Skill templates for `doccraft-story` and `doccraft-queue-audit`.
- Runtime dependency on `npx` network/package availability with user-facing
  fallback command on failure.
