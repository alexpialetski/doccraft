## ADDED Requirements

### Requirement: Update flow runs the per-package docs scaffold when packages are declared
The `doccraft update` flow (and the shared `installDoccraftSkills` helper used by `init`) SHALL perform a per-package docs scaffold phase after the root docs scaffold and after the extension scaffold phase introduced in ADR 013. The phase SHALL be skipped silently when `packages` is empty or absent. When `packages` is non-empty, the phase SHALL invoke the shared template-walker against `templates/docs/` for each declared package, writing into `<package-path>/<docsDir>/` with never-overwrite semantics.

#### Scenario: Update scaffolds new per-package docs trees
- **WHEN** `doccraft update` runs against a project whose `doccraft.json` lists two packages with no existing `docs/` directories under either
- **THEN** the bundled `templates/docs/` skeleton is written under each declared `<package-path>/<docsDir>/`
- **THEN** the user is informed of the count of files created per package

#### Scenario: Update preserves existing per-package docs files
- **WHEN** `doccraft update` runs against a project whose package already has `<package-path>/<docsDir>/queue.md`
- **THEN** the existing queue.md is unchanged
- **THEN** other missing files in the same package's docs tree are written

#### Scenario: Update with empty packages array skips the per-package phase
- **WHEN** `doccraft update` runs with `packages: []`
- **THEN** no per-package scaffold writes occur
- **THEN** behaviour is identical to a project with no `packages` key
