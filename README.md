# doccraft

[![npm version](https://img.shields.io/npm/v/doccraft.svg)](https://www.npmjs.com/package/doccraft)
[![npm downloads](https://img.shields.io/npm/dm/doccraft.svg)](https://www.npmjs.com/package/doccraft)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/doccraft.svg)](https://nodejs.org)

Documentation and project-story skills for [Claude Code](https://claude.com/claude-code) and [Cursor](https://cursor.com), layered on [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## Skills

- **`doccraft-story`** — product stories under `docs/stories/` with typed YAML frontmatter.
- **`doccraft-adr`** — architecture decision records under `docs/adr/`, Nygard-style.
- **`doccraft-session-wrap`** — propose doc artifacts after a design/research thread, only when durable insight was produced.
- **`doccraft-queue-audit`** — reconcile the story dependency graph, pick-next queue, and backlog.
- **`doccraft-config`** — tailor `doccraft.json` to your project. Analyse mode proposes values; edit mode validates targeted changes against the embedded JSON Schema.
- **`doccraft-update`** — upgrade doccraft and the bundled OpenSpec. Silent when no migration applies; summarises and gates when one does.

Skills install to `.claude/skills/` (read natively by Claude Code; auto-discovered by Cursor 2.4+). Cursor also gets rule stubs under `.cursor/rules/` that auto-attach when editing docs.

## Install

```bash
npx doccraft init
```

Then invoke the **`doccraft-config`** skill in Claude Code or Cursor to tailor `doccraft.json` to your project.

Requires Node.js `>= 22.14.0`.

## Updating

Invoke the **`doccraft-update`** skill. It reads the `version` stamp in `doccraft.json`, runs the upgrade silently when possible, or summarises and gates when a release declares a migration. OpenSpec is upgraded transitively. No local install required — skills use `npx doccraft@latest` under the hood.

## `doccraft.json`

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/doccraft@0.9.0/schema/doccraft.schema.json",
  "version": "0.9.0",
  "_hint": "Edit with the doccraft-config skill.",
  "docsDir": "docs",
  "story": { "areas": ["..."], "themes": ["..."] }
}
```

- `$schema` is pinned to the same version as the `version` stamp and served by jsDelivr — IDEs (VS Code, JetBrains) validate and show field descriptions out of the box.
- `version` and the URL's version segment are managed by doccraft (`init` writes them, `update` bumps them together; nothing else in the file is touched).
- Every other key is user-owned. Deleting the file falls back to in-skill defaults.

## Commands

- **`doccraft init [path]`** — scaffolds `doccraft.json`, installs skills, runs `openspec init`.
- **`doccraft update [path]`** (alias: `upgrade`) — refreshes skills, runs `openspec update`, bumps the `version` stamp.
- **`doccraft llm`** — emits the JSON manifest consumed by the `doccraft-update` skill. No flags, no arguments.

Common flags on `init` / `update`: `--tools <claude|cursor|all|none>`, `--force`, `--skip-openspec`. See `doccraft <cmd> --help` for full options.

## Contributing

See [CLAUDE.md](./CLAUDE.md) for the dev loop and conventions. Releases are automated via semantic-release on conventional-commit messages.

## License

[MIT](./LICENSE) — changelog at [CHANGELOG.md](./CHANGELOG.md).
