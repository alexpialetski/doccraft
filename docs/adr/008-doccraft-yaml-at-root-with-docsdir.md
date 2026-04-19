# ADR 008: Move config to `doccraft.yaml` at project root with single `docsDir` key

**Status:** Superseded by [ADR 009](009-llm-command-and-assisted-setup.md) — supersedes [ADR 004](004-docs-config-schema.md).

ADR 009 moves the config file to `doccraft.json` (JSON with `$schema`) and
adds a top-level `version` stamp. The location-at-root decision and the
`docsDir` key both survive; only the filename and format change. The
rationale below remains accurate as a record of the YAML-era design.

## Context

ADR 004 placed the project config at `docs/config.yaml` with per-artifact
path keys (`adr.path`, `queue.path`, `backlog.path`) so users could relocate
individual subdirectories. Two problems emerged in practice:

**Chicken-and-egg on config discovery.** If a user changes `docsDir` to
something other than `docs`, the CLI needs to read that value from config
before it knows where to find config. Config inside the docs tree creates
a self-referential lookup that cannot be resolved without a separate
bootstrap mechanism or a fixed fallback location.

**Cursor rules cannot be dynamic.** Cursor evaluates `.mdc` frontmatter
globs at startup, not at invocation time. The path values in `globs:`
must therefore be baked in at install time — but the individual path keys
(`adr.path`, `queue.path`, `backlog.path`) were designed for runtime
reading by the model, not install-time substitution. Supporting them
correctly would require the CLI to parse and reconcile five different path
keys per install, while the common case (renaming `docs/` to something
else) needed only one value.

**Individual path overrides add complexity for marginal gain.** In
practice no one stores ADRs in a different subfolder than stories — the
whole docs tree moves together. Per-artifact paths are rarely used
individually and add schema surface that must be maintained.

## Decision

### Config file location — project root

Move the config file from `docs/config.yaml` to `doccraft.yaml` at the
project root. The CLI always looks for `doccraft.yaml` at the project root;
`docsDir` inside it tells everything else where the docs tree lives.

### Config shape — replace per-artifact paths with single `docsDir`

Remove `adr.path`, `queue.path`, and `backlog.path`. Replace with:

```yaml
docsDir: docs
```

Sub-folder names (`adr/`, `stories/`, `queue.md`, `backlog.md`) remain
hardcoded. Renaming individual subdirectories is not supported; the whole
docs root moves as a unit.

The rest of the schema (`story.*`, `queue.tables.*`, `queueAudit.*`,
`sessionWrap.*`) is unchanged.

### Install-time substitution

Skills and Cursor rules use a `{{DOCS_DIR}}` template variable in their
source files. `installSkills()` and `installRules()` read `docsDir` from
`doccraft.yaml` (defaulting to `docs`) and substitute before writing to
`.claude/skills/` and `.cursor/rules/`. This is the only way to get
correct Cursor globs for non-default docs locations.

### Scaffold function split

`scaffoldRootConfigIfMissing()` writes `doccraft.yaml` at project root on
first `init`/`update`. `scaffoldDocsIfMissing()` continues to seed the
`docs/` tree (README, backlog, queue, story/adr indexes). The two are
independent so neither is blocked by the other.

## Consequences

- + Config discovery is unambiguous: always `{projectRoot}/doccraft.yaml`,
  no matter what `docsDir` is set to.
- + Cursor rule globs are generated correctly for any `docsDir` value
  without manual editing.
- + Schema is simpler; one key covers the most common customisation need.
- + Skills and rules are consistently substituted at install time —
  no divergence between what Cursor reads and what the model reads.
- - Per-artifact path overrides are no longer supported. Users who stored
  ADRs at a non-standard path under the old `adr.path` key must migrate
  by moving the folder or accepting that skills will reference
  `{docsDir}/adr/`.
- - `doccraft.yaml` is a new file in the project root. Projects that
  prefer a clean root will see one more file. A future flag to move it
  into a dotdir is deferred.

## Alternatives considered

- **Keep `docs/config.yaml`, add a fixed fallback.** The CLI could
  look for `docs/config.yaml` unconditionally (ignoring `docsDir`) for
  backwards compatibility. Rejected: the file still lives inside the
  docs tree, so changing `docsDir` remains confusing even if technically
  resolvable.

- **Accept `--docs-dir` CLI flag instead.** Pass the root at `init` time
  via flag rather than reading it from config. Rejected: loses persistence
  — every `doccraft update` invocation would require the flag. Config file
  is the right place for a project-level setting.

- **Keep individual path keys, add `{{DOCS_DIR}}` as a composed value.**
  The CLI could derive `{{DOCS_DIR}}` from `adr.path` by stripping `/adr`.
  Rejected: fragile — the derivation breaks if paths don't share a common
  root, and it makes the schema harder to explain ("set `adr.path` to move
  everything?").

- **Remove path configurability entirely.** Hardcode `docs/` everywhere.
  Considered as a first step; rejected because renaming the docs folder
  is a legitimate monorepo need (e.g. `design/`, `planning/`).
