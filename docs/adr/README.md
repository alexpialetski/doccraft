# Architecture decision records

Numbered files: `NNN-short-slug.md` (e.g. `001-skill-install-pipeline.md`).
Pick the next unused number; never renumber published ADRs — add a new
ADR that **supersedes** instead.

This README is the index only — it does not follow the `NNN-` format and
does not require the full Nygard structure. See the `doccraft-adr` skill
for the ADR format (Context / Decision / Consequences / Alternatives;
explicit Status and supersession).

## Index

| # | Title | Status |
|---|-------|--------|
| [001](001-skill-install-pipeline.md) | Mirror OpenSpec install pattern; raw-file templates | Accepted |
| [002](002-defer-config-externalization.md) | Defer `docs/config.yaml` externalization until after all four skills ship | Accepted |
| [003](003-cursor-rule-stubs-only.md) | Ship Cursor rule stubs; no rule equivalents for Claude Code | Accepted |
| [004](004-docs-config-schema.md) | `docs/config.yaml` schema — shape, location, lifecycle | Superseded by 008 |
| [005](005-consolidate-skills-for-dual-tool.md) | Consolidate skills install to `.claude/skills/` for dual-tool projects (opt-in) | Superseded by 007 |
| [006](006-doccraft-owns-tool-selection.md) | doccraft owns tool selection in init; forwards `--tools` to openspec | Accepted |
| [007](007-default-skill-install-to-claude-skills.md) | Install skills only to `.claude/skills/`; `.cursor/skills/` is never written | Accepted |
| [008](008-doccraft-yaml-at-root-with-docsdir.md) | Move config to `doccraft.yaml` at project root with single `docsDir` key | Accepted |
| [012](012-story-model-hints-registry.md) | Optional `story.modelHints` path + project-owned registry markdown | Accepted |
