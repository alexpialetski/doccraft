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

> Managed by **doccraft** — `doccraft update` regenerates this file. Local edits will be overwritten. See `doccraft.json` to override project-specific vocabulary and paths without touching this file.

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
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Doccraft configuration",
  "description": "Configuration for doccraft skills and CLI behaviour. Managed by the doccraft-config skill — run `doccraft init` to scaffold, then invoke doccraft-config to tailor.",
  "type": "object",
  "properties": {
    "$schema": {
      "title": "JSON Schema URL",
      "description": "Schema pointer consumed by IDE tooling for validation and hover tooltips. doccraft update keeps this in sync with the version stamp — do not edit manually.",
      "type": "string",
      "examples": [
        "https://cdn.jsdelivr.net/npm/doccraft@0.9.0/schema/doccraft.schema.json"
      ]
    },
    "version": {
      "title": "Doccraft version",
      "description": "The doccraft version this config was last written or updated by. doccraft update bumps this automatically via surgical edit.",
      "type": "string",
      "examples": [
        "0.9.0",
        "1.0.0",
        "1.2.3"
      ]
    },
    "_hint": {
      "title": "Authoring hint",
      "description": "Reminder that doccraft-config is the recommended authoring tool for this file. The schema embedded in the skill matches the installed doccraft version — no CLI call required for edits.",
      "type": "string",
      "examples": [
        "Edit with the doccraft-config skill (npx doccraft@latest llm exposes the schema)."
      ]
    },
    "docsDir": {
      "title": "Docs directory",
      "description": "Root folder for all doccraft planning docs, relative to the project root. Substituted into installed skill files and Cursor rule globs as docs at install time. Re-run `doccraft update` after changing this value.",
      "type": "string",
      "examples": [
        "docs",
        "design",
        "planning",
        ".docs"
      ]
    },
    "story": {
      "title": "Story skill configuration",
      "description": "Vocabulary and identifier format consumed by the doccraft-story skill. Values here teach the skill your project-specific taxonomy without touching SKILL.md.",
      "type": "object",
      "properties": {
        "areas": {
          "title": "Story areas",
          "description": "Subsystem or team tags used in story `area:<value>` frontmatter. Aligns with your conventional-commit scopes for traceability.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "examples": [
            [
              "cli",
              "api",
              "ui"
            ],
            [
              "backend",
              "frontend",
              "infra"
            ],
            [
              "auth",
              "data",
              "payments"
            ]
          ]
        },
        "slices": {
          "title": "Product slices",
          "description": "User-facing product surface tags used in story `slice:<value>` frontmatter. Leave empty for purely technical tools with no distinct product surfaces.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "examples": [
            [
              "auth",
              "dashboard",
              "billing"
            ],
            [
              "admin",
              "onboarding",
              "settings"
            ],
            []
          ]
        },
        "themes": {
          "title": "Story themes",
          "description": "Cross-cutting concern or delivery theme tags used in story `theme:<value>` frontmatter. Recur across multiple stories and help doccraft-session-wrap cluster related work.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "examples": [
            [
              "performance",
              "security",
              "dx"
            ],
            [
              "testing",
              "docs",
              "install"
            ],
            [
              "observability",
              "reliability",
              "compliance"
            ]
          ]
        },
        "id": {
          "title": "Story identifier format",
          "description": "Controls which `id:` values doccraft-story accepts. Validated on creation and edit.",
          "type": "object",
          "properties": {
            "tiers": {
              "title": "Priority tiers",
              "description": "Ordered priority tier prefixes (e.g. `p0`, `p1`). doccraft-story and doccraft-queue-audit use these to group and sort work. Empty list disables tier conventions.",
              "type": "array",
              "items": {
                "type": "string"
              },
              "examples": [
                [
                  "p0",
                  "p1",
                  "p2",
                  "p3"
                ],
                [
                  "p0",
                  "p1",
                  "p2",
                  "p3",
                  "p4"
                ],
                [
                  "critical",
                  "high",
                  "normal"
                ]
              ]
            },
            "pattern": {
              "title": "ID pattern",
              "description": "Regex the story `id:` value must satisfy. Validated by doccraft-story on creation and edit. Use anchors (^ and $) to be precise.",
              "type": "string",
              "examples": [
                "^(P\\d+(\\.\\d+)?|[a-z][a-z0-9-]+)$",
                "^P\\d+$",
                "^[a-z][a-z0-9-]+-\\d+$"
              ]
            }
          }
        }
      }
    },
    "queue": {
      "title": "Queue configuration",
      "description": "Labels for the named table sections in docs/queue.md. doccraft-queue-audit locates tables by heading text, not position.",
      "type": "object",
      "properties": {
        "tables": {
          "title": "Queue table labels",
          "description": "Human-readable heading text for each queue table section. Change these if your project uses different headings.",
          "type": "object",
          "properties": {
            "suggestedOrder": {
              "title": "Suggested order table label",
              "description": "Heading for the main prioritised work queue. doccraft-queue-audit searches docs/queue.md for a table under this exact heading.",
              "type": "string",
              "examples": [
                "Suggested order",
                "Next up",
                "Sprint queue"
              ]
            },
            "platformSpikes": {
              "title": "Platform spikes table label",
              "description": "Heading for exploratory or research work not yet ready for the main queue.",
              "type": "string",
              "examples": [
                "Platform spikes",
                "Spikes",
                "Research queue"
              ]
            }
          }
        }
      }
    },
    "queueAudit": {
      "title": "Queue audit configuration",
      "description": "Tuning knobs for the doccraft-queue-audit skill.",
      "type": "object",
      "properties": {
        "laneFrom": {
          "title": "Lane source tags",
          "description": "Which frontmatter tag prefixes, in priority order, the audit uses to assign a story to a swimlane. First match wins. `area` is most common; set `slice` first for products that organise primarily by surface.",
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "area",
              "slice"
            ]
          },
          "examples": [
            [
              "area",
              "slice"
            ],
            [
              "slice",
              "area"
            ]
          ]
        },
        "scale": {
          "title": "Audit scale limits",
          "description": "Safety thresholds that cause the audit to pause for confirmation before applying large changes. Raise for bigger projects; lower for strict containment.",
          "type": "object",
          "properties": {
            "maxStoryFiles": {
              "title": "Max story files per audit run",
              "description": "If a single audit pass would touch more than this many story files, it stops and asks for confirmation before applying.",
              "type": "number",
              "examples": [
                5,
                10,
                20
              ]
            },
            "maxQueueReorderPct": {
              "title": "Max queue reorder percentage",
              "description": "If a reorder would move more than this percentage of Suggested order rows, the audit stops for confirmation. Range 0–100.",
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "examples": [
                50,
                25,
                75
              ]
            }
          }
        }
      }
    },
    "sessionWrap": {
      "title": "Session wrap configuration",
      "description": "Controls which artifact categories doccraft-session-wrap considers in scope. Disabling a category prevents the skill from proposing that folder tree.",
      "type": "object",
      "properties": {
        "capture": {
          "title": "Capture categories",
          "description": "Enable or disable each artifact category. Set to `false` for categories your project does not maintain.",
          "type": "object",
          "properties": {
            "research": {
              "title": "Research notes",
              "description": "Allow doccraft-session-wrap to propose artifacts under docs/research/. Set false if your project does not maintain a research folder.",
              "type": "boolean",
              "examples": [
                true,
                false
              ]
            },
            "reference": {
              "title": "Reference docs",
              "description": "Allow doccraft-session-wrap to propose artifacts under docs/reference/. Set false if your project does not maintain a reference folder.",
              "type": "boolean",
              "examples": [
                true,
                false
              ]
            },
            "business": {
              "title": "Business updates",
              "description": "Allow doccraft-session-wrap to propose artifacts under docs/business/. Set false if your project does not maintain a business folder.",
              "type": "boolean",
              "examples": [
                false,
                true
              ]
            }
          }
        }
      }
    }
  }
}
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
