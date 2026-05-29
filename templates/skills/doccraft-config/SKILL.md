---
name: doccraft-config
description: >-
  Configure doccraft for this project by tailoring doccraft.json — the
  vocabulary, id format, queue labels, and session-wrap settings. Two modes:
  Analyse mode reads the project tree and proposes values for all key fields
  with reasoning, applying on approval; Edit mode applies a targeted change
  (e.g. "add area:telemetry") and validates against the embedded schema before
  writing. Never calls npx — the embedded schema matches the installed
  doccraft version.
---

# doccraft — config

## When to use

- **After `doccraft init`**: run Analyse mode to tailor the freshly scaffolded
  `doccraft.json` to the project's actual subsystems, surfaces, and themes.
- **Any time you want to add or change a config field**: run Edit mode with a
  plain-English request ("add slice:billing", "set maxStoryFiles to 10").
- **Before invoking `doccraft-story` or `doccraft-queue-audit`** when skill
  output references unfamiliar vocabulary — the config is probably stale.

## Schema

The full JSON Schema for `doccraft.json` is embedded below. Use it for
validation in Edit mode instead of calling any CLI.

```json
{{DOCCRAFT_CONFIG_SCHEMA}}
```

## Modes

### Analyse mode (no specific field requested)

1. Read the project tree: directory names, `package.json` scripts/workspaces,
   git remote, conventional-commit scope history if a `.git/` dir is present.
2. Propose values for each key group with one sentence of reasoning per group:
   - `story.areas` — one entry per logical subsystem (aligns with commit scopes).
   - `story.slices` — one entry per user-facing product surface; `[]` for
     purely technical tools.
   - `story.themes` — recurring cross-cutting concerns from the tree.
   - `story.id.tiers` — e.g. `[p0,p1,p2]` for most projects; more tiers only
     when severity levels are meaningfully distinct.
   - `queueAudit.scale` — lower thresholds for small repos, higher for large.
   - `sessionWrap.capture` — disable categories for folder trees the project
     does not maintain.
3. Show the proposed `doccraft.json` diff (or full file if none exists yet).
4. Wait for approval before writing any file.
5. On approval: write `doccraft.json` at the project root. Do not rewrite
   `version` or `$schema` — preserve those bytes exactly.

### Edit mode (specific change requested)

1. Read the current `doccraft.json` (use defaults if missing).
2. Parse the requested change.
3. Validate the proposed new value against the embedded schema above. If
   invalid, report the violation and stop — do not write.
4. Apply the change surgically: update only the targeted field(s), preserving
   all other bytes (key order, whitespace, comments are not present in JSON
   but formatting should be preserved).
5. Write `doccraft.json` and confirm what changed.

## Extensions

When `doccraft.json` declares an `extensions: [...]` array, each entry points
at a project-local directory containing an `extension.yaml` manifest. At
`doccraft update`, doccraft bakes fragments declared by those manifests into
skill bodies at named injection points and scaffolds any declared folders.
The extension framework is the supported way to add project-specific
guidance (additional frontmatter fields, body sections, instructions) to
the four core skills (`doccraft-story`, `doccraft-adr`,
`doccraft-queue-audit`, `doccraft-session-wrap`) without forking doccraft.

When editing the `extensions` array:

- **Order is significant.** Fragments concatenate in declaration order at
  each injection point — surface that to the user when adding a new entry.
- **Each `path` must be a directory** relative to the project root, and
  the directory must already exist (or be about to be created in the same
  change). doccraft does not scaffold extension directories; the user
  authors them.
- **Validation runs at `doccraft update`**, not at config write time —
  malformed manifests surface on the next update.

## Constraints

- **Never call `npx doccraft@latest`** — the embedded schema is authoritative
  for the installed version. Reaching for `@latest` could propose fields not
  yet supported.
- **Never rewrite `version` or `$schema`** — those are managed by
  `doccraft update` / `bumpConfigVersion`. Preserve them verbatim.
- **Tolerate a missing `doccraft.json`** — proceed with defaults; offer to
  create the file in Analyse mode.
- **Gate on approval** before writing any file in Analyse mode. Edit mode may
  apply without a gate for single-field changes unless the change is
  destructive (e.g. clearing an entire array).
