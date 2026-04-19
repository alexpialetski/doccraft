---
id: P1.5
title: Assisted setup and migration — JSON config, doccraft llm, doccraft-config/-update skills
status: todo
impact: H
urgency: soon
tags:
  - area:cli
  - area:skills
  - area:config
  - theme:install
  - theme:ux
openspec: recommended
updated: 2026-04-19
roadmap_ref: P1.5
depends_on: []
adr_refs:
  - 009-llm-command-and-assisted-setup.md
  - 008-doccraft-yaml-at-root-with-docsdir.md
---

## Problem / outcome

Three post-install gaps (see [ADR 009](../adr/009-llm-command-and-assisted-setup.md)):

1. New users have no guided way to tailor the config — defaults land,
   but "what should I actually change?" is unanswered.
2. There is no migration pathway between doccraft versions. The config
   has no version stamp, so future schema changes break silently.
3. YAML with inline comments duplicates what a dedicated config skill
   owns better. JSON with `$schema` gives native IDE validation for free.

Outcome: a user runs `doccraft init`, gets a `doccraft.json` with a
`$schema` pointer and `version` stamp, then the `doccraft-config` skill
walks them through a tailored config and applies it. Later, they invoke
`doccraft-update` which reads the stamped version, fetches the manifest
via `npx doccraft@latest llm`, silently runs update when no migration
entry applies, or summarises and gates when one does.

## Acceptance criteria

### Config format

- [ ] Scaffolded file is `doccraft.json` at project root (replaces
  `doccraft.yaml` from ADR 008 — no users shipped, so clean-break rename
  with no compat shim).
- [ ] Scaffolded file starts with `"$schema"`, `"version"`, and `"_hint"`
  keys in that order. `_hint` names the `doccraft-config` skill as the
  authoring tool.
- [ ] `$schema` points at
  `https://cdn.jsdelivr.net/npm/doccraft@<version>/schema/doccraft.schema.json`,
  pinned to the same version as the `version` stamp. The schema is
  shipped inside the npm tarball; jsDelivr serves it automatically
  after each `npm publish`. No project-local schema file, no
  `node_modules/` dep.
- [ ] `doccraft update`'s surgical edit rewrites **both** `version`
  and the version segment of the `$schema` URL in a single pass, so
  the two never drift. Test asserts both are updated and nothing else
  in the file moves.
- [ ] YAML config loader and templates are removed; no dual-format
  support. The `docsDir` key and install-time `{{DOCS_DIR}}`
  substitution from ADR 008 survive; only the filename and format
  change.
- [ ] `doccraft.yaml` in this repo is migrated to `doccraft.json` as
  part of the story — proves the rename on a real config.

### Schema source of truth

- [ ] JSON Schema for the config lives as TypeScript source (e.g.
  `src/utils/config-schema.ts`) and is:
  - Emitted to `schema/doccraft.schema.json` inside the published
    npm tarball (served by jsDelivr; target of the project's `$schema`
    URL).
  - Inlined into the `doccraft llm` manifest output.
  - Substituted into `templates/skills/doccraft-config/SKILL.md` via a
    `{{DOCCRAFT_CONFIG_SCHEMA}}` placeholder.
- [ ] Every field in the TS schema source carries `title`,
  `description`, and at least one `examples` entry. Descriptions are
  written for two audiences at once: IDE hover tooltips and LLM
  context (the `doccraft-config` skill reads them instead of
  duplicating prose in `SKILL.md`).
- [ ] Lint rule / test fails the build if any schema property omits
  `description`. Keeps the contract honest.
- [ ] Test asserts all three downstream copies (npm tarball file, CLI
  manifest, skill body) derive from the same TS source on every build
  (no drift).

### CLI

- [ ] `doccraft init` writes the scaffolded `doccraft.json` with
  `version` set to the current package version.
- [ ] `doccraft update` performs a **surgical edit** on the `version`
  string — only that value is rewritten; every other byte of the file
  preserved. Test diffs the file before and after update.
- [ ] New top-level command `doccraft llm` (no subcommands, no flags)
  emits a single compact JSON manifest to stdout with:
  - `version` — doccraft version, injected at build time from a
    `{{DOCCRAFT_VERSION}}` placeholder substituted against
    `package.json`. No runtime `require('../package.json')`.
  - `bundledOpenspecVersion` — version of the bundled openspec dep.
  - `schema` — the JSON Schema from the single source (section above).
  - `skills` — array of `{name, purpose}` only; one-line purpose per
    skill, no SKILL.md body, no install path.
  - `migrations` — array of `{from, to, summary, steps[]}` entries.
    **Sparse by design**: present only when a release requires
    user-assisted edits. Expected steady-state length: 0 or 1.
- [ ] Manifest output shape is stable enough to be depended on by
  skills; any breaking change to the shape lands as its own
  migration entry.
- [ ] `doccraft llm --help` documents the payload fields; the command
  takes no flags and no positional arguments.

### Skills

- [ ] Both new skills are authored with the Claude `skill-creator` skill
  (frontmatter, description, structure go through its conventions) and
  land under `templates/skills/`.
- [ ] `doccraft-config` skill with two documented modes:
  - **Analyse mode**: reads the project tree, proposes values for
    `story.areas`, `story.slices`, `story.themes`, `story.id.tiers`,
    `queueAudit.scale`, `sessionWrap.capture`, explains reasoning, and
    applies on approval.
  - **Edit mode**: targeted edits driven by a user request; validates
    against the **embedded schema** in `SKILL.md` (the
    `{{DOCCRAFT_CONFIG_SCHEMA}}` substitution) and edits
    `doccraft.json` in place. No CLI call — the schema the skill
    knows is the schema the installed doccraft validates against.
  - Does **not** use `npx doccraft@latest`.
- [ ] `doccraft-update` skill — silent by default:
  - reads `version` from `doccraft.json`;
  - invokes `npx doccraft@latest llm` once;
  - filters the manifest's `migrations` for entries covering
    `local → latest`;
  - **dominant path (no entries):** runs `npx doccraft@latest update`,
    bumps the `version` stamp, reports what happened — no prompt;
  - **assisted path (entries present):** summarises declared steps,
    gates on user approval, then runs update and bumps the stamp;
  - never fabricates migration steps the manifest did not declare.
- [ ] Both skills are installed by `runInit` / `runUpdate` under
  `.claude/skills/` per [ADR 007](../adr/007-default-skill-install-to-claude-skills.md).
- [ ] `doccraft.json` gains no new required fields; both skills tolerate a
  missing config via in-skill defaults.

### Documentation

- [ ] `README.md` skills table grows from four rows to six; install
  section shows the full flow (`init` → `doccraft-config` → ongoing
  `doccraft-update`).
- [ ] `CLAUDE.md` skill table, directory map, and setup instructions
  updated for JSON config + two new skills.
- [ ] ADR 009 is linked from the queue / backlog when the story ships,
  and ADR 008's Status line already points at 009.

## Notes

OpenSpec recommended because: `doccraft llm`'s output shapes become a
public contract the moment a skill starts parsing them. Designing the
JSON shapes (schema, migration entry, skills manifest) before
implementation catches surface-design mistakes cheaply.

**Sequencing within the story.** Land in this order so each piece can be
tested standalone:

1. TypeScript schema source + build step that emits
   `schema/doccraft.schema.json` and substitutes
   `{{DOCCRAFT_CONFIG_SCHEMA}}` in skill templates.
2. `doccraft.yaml` → `doccraft.json` rename: loader, scaffold,
   dogfood config. Includes `version` field + surgical edit in
   `doccraft update` + `{{DOCCRAFT_VERSION}}` build substitution.
3. `doccraft llm` command emitting the full manifest with
   `version`, `bundledOpenspecVersion`, `schema`, `skills`, and empty
   `migrations`. First real `migrations` entry ships only when a
   release needs one.
4. `doccraft-config` skill (analyse + edit modes) — authored via
   `skill-creator`, schema inlined from the build step above.
5. `doccraft-update` skill — authored via `skill-creator`.
6. README + CLAUDE.md updates once the above lands.

**Non-goals.**

- Caching `npx doccraft@latest` output. Revisit only if latency becomes a
  real complaint.
- Writing a config-analysis transcript to `docs/`. Nice-to-have; deferred.
- Supporting `doccraft` as a local project dependency. `doccraft-update`
  uses npx; `doccraft-config` uses neither (schema is embedded).
- Self-hosting the schema URL. jsDelivr serves the schema published in
  the npm tarball; no separate hosting pipeline is required.

**Authoring note.** Use the Claude `skill-creator` skill to draft and
revise both `doccraft-config` and `doccraft-update` — same convention
recorded in `CLAUDE.md` for this repo.
