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

## Model hints registry

When `story.modelHints` is set in `doccraft.json`, it points at a **project-owned** markdown file (path relative to the project root). That file is the contract for which models suit which work and **how the team records that in stories**: plain markdown **appended at the end of Notes** (optionally under a final **Models / workflow** heading inside Notes). Doccraft does not validate the registry file — confirm only that the path exists before offering to help edit it.

Recommended sections inside the registry (conventions, not schema-enforced):

- **Available models** — rows your team fills in for each tier or endpoint you use.
- **Phases and roles** — optional; how different parts of the work (e.g. OpenSpec vs implementation) map to different models; restate that stories capture this as closing Notes prose.
- **Decision rules** — optional; how guidance combines with story tags, impact, urgency, `openspec`.
- **Per-story mapping** — optional table for an authoritative live list.

**Tailoring flow:** when the user invokes this skill and `story.modelHints` is configured, you may offer to walk them through replacing the neutral starter with the project's actual models and phase rules, *only if* the file still matches the bundled starter (heuristic: same byte size or matching header line as `templates/docs/reference/model-hints.md` in the doccraft package). If the file is clearly customised, do not reset it — help in place.

**Constraint:** do not claim the registry passes schema validation beyond file existence at the configured path.

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
