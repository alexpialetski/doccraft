# doccraft

Documentation and project-story skills for [Claude Code](https://claude.com/claude-code) and [Cursor](https://cursor.com), layered on [OpenSpec](https://github.com/Fission-AI/OpenSpec).

`doccraft` is a thin CLI that:

1. Wraps `openspec init` / `openspec update` so you don't have to run them separately.
2. Installs a curated set of skills and rules for Claude Code and Cursor that manage docs-folder workflow and project story.

Skill templates ship in the next release — the initial `0.x` versions just set up the automation pipeline and wrap OpenSpec.

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

Initializes doccraft in a project. Runs `openspec init` under the hood and then (soon) installs doccraft's skill templates.

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
- `--skip-openspec` — refresh doccraft skills only.

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

Releases are automated via [Changesets](https://github.com/changesets/changesets):

1. Add a changeset to your PR: `pnpm exec changeset`.
2. Merge to `main`. The release workflow opens a "Version Packages" PR.
3. Merge the Version Packages PR to publish to npm and create a GitHub release.

Conventional commit format is enforced on PRs by commitlint.

## License

[MIT](./LICENSE)
