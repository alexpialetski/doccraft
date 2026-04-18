# doccraft

Documentation and project-story skills for [Claude Code](https://claude.com/claude-code) and [Cursor](https://cursor.com), layered on [OpenSpec](https://github.com/Fission-AI/OpenSpec).

`doccraft` is a thin CLI that:

1. Wraps `openspec init` / `openspec update` so you don't have to run them separately.
2. Installs a curated set of skills and rules for Claude Code and Cursor that manage docs-folder workflow and project story.

Skills bundled so far:

- **`doccraft-story`** — author/update product stories under `docs/stories/` with a typed YAML frontmatter (id, status, impact, urgency, tags, openspec, depends_on).
- **`doccraft-adr`** — author/update architecture decision records under `docs/adr/` with Nygard-style Context / Decision / Consequences and explicit status + supersession.
- **`doccraft-session-wrap`** — after a design/research/prioritisation thread, propose doc artifacts (ADR / research / reference / business / story / backlog edits) only when the conversation produced durable insight worth capturing.
- **`doccraft-queue-audit`** — reconcile the story dependency graph, pick-next queue, and backlog status. In Agent mode, applies objective fixes in the same turn (with scale and working-tree containment); in Ask mode, proposes only.

Each skill lands identically in `.claude/skills/<name>/SKILL.md` and `.cursor/skills/<name>/SKILL.md`; both tools consume the same format.

Cursor users additionally get three glob-scoped rule stubs under `.cursor/rules/` (`planning-stories.mdc`, `planning-adrs.mdc`, `planning-queue.mdc`) that auto-attach when editing the matching docs and point at the installed skills. Claude Code has no equivalent rules primitive — its skills trigger on description match, so no rule stubs are installed there.

`doccraft init` also scaffolds starter `docs/README.md`, `docs/backlog.md`, `docs/queue.md`, `docs/stories/README.md`, and `docs/adr/README.md`. These are seeded once on first install — `doccraft update` never overwrites them, so your actual backlog rows and project description stay intact across updates.

## Install

```bash
npx doccraft init
```

Or install globally:

```bash
npm i -g doccraft
doccraft init
```

Requires Node.js `>= 20.19.0`.

## Commands

### `doccraft init [path]`

Initializes doccraft in a project. Runs `openspec init` under the hood, then installs doccraft's skill templates into each selected tool's `skills/` directory.

Flags forwarded to `openspec init`:

- `--tools <tools>` — which AI tools to configure (e.g. `claude`, `cursor`, `all`).
- `--force` — auto-cleanup legacy files without prompting.
- `--profile <profile>` — override global config profile.

doccraft-specific flags:

- `--skip-openspec` — install doccraft skills only, skip `openspec init`.

### `doccraft update [path]` (alias: `upgrade`)

Refreshes doccraft skill templates and runs `openspec update` to pull new OpenSpec instruction files.

Flags:

- `--force` — force update even when already up to date.
- `--tools <tools>` — which tools to refresh doccraft skills into (e.g. `claude`, `cursor`, `all`, `none`). Defaults to tools detected in the project.
- `--skip-openspec` — refresh doccraft skills only.

If `--tools` is omitted, doccraft detects installed tools by scanning for `.claude/` or `.cursor/`. When neither is present, doccraft falls back to installing into every supported tool.

## Development

```bash
pnpm install
pnpm run build
pnpm run test
```

Run the CLI locally:

```bash
pnpm run dev:cli -- init ./some/project
```

### Releasing

Releases are automated via [semantic-release](https://github.com/semantic-release/semantic-release):

1. Use conventional-commit messages (`feat:`, `fix:`, `feat!:` for breaking).
2. Merge to `main`. The release workflow publishes to npm and creates a GitHub release automatically based on the commit history.

Conventional commit format is enforced on PRs by commitlint.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full release history.

## License

[MIT](./LICENSE)
