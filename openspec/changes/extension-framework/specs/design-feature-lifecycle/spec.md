## REMOVED Requirements

### Requirement: Design feature SHALL install upstream designer-skills during init
**Reason**: ADR 013 removes all bespoke opt-in plumbing from doccraft. The `design` feature flag, the `--features design` CLI flag on `doccraft init`, and the `runDesignerSkills` subprocess are deleted. designer-skills setup is no longer doccraft's responsibility.
**Migration**: Audio-stage installs `julianoczkowski/designer-skills` via its own tooling outside doccraft (e.g. a project script that runs `npx --yes skills add julianoczkowski/designer-skills --agent claude-code --yes` after `doccraft update`). No doccraft-side code path remains.

### Requirement: Design feature SHALL reinstall designer-skills on update when persisted
**Reason**: Removed alongside the install path. With `features[]` deleted from the schema, there is no persisted flag to replay.
**Migration**: Audio-stage's own update script invokes designer-skills install whenever it wants the upstream skills refreshed.

### Requirement: Subprocess failures include manual fallback guidance
**Reason**: Removed alongside the subprocess itself. No doccraft code path invokes `npx skills add`.
**Migration**: Audio-stage's own install script is responsible for error reporting and fallback messaging.
