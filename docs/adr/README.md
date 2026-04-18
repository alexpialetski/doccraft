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
