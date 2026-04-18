# CLAUDE.md

Guidance for Claude Code agents working in this repo.

## What doccraft is

An npm CLI that installs an opinionated, small set of docs-folder skills
for Claude Code and Cursor, layered on OpenSpec. Ships four skills
(authored in `templates/skills/`):

| Skill | Use for |
|-------|---------|
| `doccraft-story` | Product stories in `docs/stories/` with typed YAML frontmatter |
| `doccraft-adr` | Architecture decision records in `docs/adr/` (Nygard-style) |
| `doccraft-queue-audit` | Reconcile dependency graph + pick-next queue + backlog |
| `doccraft-session-wrap` | Propose doc artifacts at the end of a design thread |

Plus three Cursor rule stubs in `templates/rules/` (`planning-stories.mdc`,
`planning-adrs.mdc`, `planning-queue.mdc`) that glob-attach when editing
the matching files under `docs/`.

## This repo dogfoods its own skills

Everything under [`docs/`](docs/) is authored using the installed skills
— the ADRs, stories, backlog, and queue are real planning artifacts, not
samples. The authoritative index lives in [`docs/README.md`](docs/README.md);
the **Recently shipped** section of [`docs/queue.md`](docs/queue.md)
summarises what's landed.

If you edit `docs/stories/**` or change `depends_on` values, invoke
`doccraft-queue-audit` to reconcile the tables — same workflow the
skill tells end users to follow.

## Setup after cloning

Skills and rules are **not** committed (they are derivable from
`templates/`). Install them locally:

```bash
pnpm install
pnpm run dev:cli -- init . --skip-openspec --tools claude,cursor
```

That scaffolds [`docs/config.yaml`](docs/config.yaml) if missing, writes
the four skills into `.claude/skills/`, and the three Cursor rule stubs
into `.cursor/rules/`. No dual-write — `.cursor/skills/` is never
populated (ADR 007).

## When to re-run install

Run `pnpm run dev:cli -- update . --skip-openspec` after any of:

- **Editing `templates/skills/*` or `templates/rules/*`.** Your changes
  are invisible to Claude Code / Cursor until the install refresh copies
  them into `.claude/skills/` or `.cursor/rules/`.
- **Pulling changes that touch `templates/`** from main. Same reason.
- **Rebuilding with `pnpm run build`** after editing `src/utils/skills.ts`
  or the commands. The CLI runs from `dist/`; code changes need a build.
  `pnpm run dev:cli` does `pnpm build` before invoking.
- **Adding new scaffold files under `templates/docs/`.** `update`
  seeds any missing docs files (never overwrites existing ones).

You **do not** need to re-run install after editing `docs/**` — those
are user-owned artifacts and neither init nor update regenerates them.

## Gitignore

- `.claude/`, `.cursor/` — tool dotdirs. Skill and rule installs are
  derivable from `templates/` and are not committed.
- `docs/` is tracked — it **is** the project's planning.

## Directory map

| Where | What |
|-------|------|
| [`templates/skills/`](templates/skills/) | Skill sources (one dir per skill, `SKILL.md` inside) |
| [`templates/rules/`](templates/rules/) | Cursor rule stubs (`.mdc`) |
| [`templates/docs/`](templates/docs/) | Starter `docs/` files scaffolded on first init |
| [`src/cli/index.ts`](src/cli/index.ts) | Commander wiring |
| [`src/commands/init.ts`](src/commands/init.ts) | `runInit`, `installDoccraftSkills` |
| [`src/commands/update.ts`](src/commands/update.ts) | `runUpdate` |
| [`src/utils/skills.ts`](src/utils/skills.ts) | Tool resolution, install, scaffold helpers |
| [`src/utils/openspec.ts`](src/utils/openspec.ts) | Subprocess bridge to `@fission-ai/openspec` |
| [`docs/adr/`](docs/adr/) | ADRs — every significant design decision |
| [`docs/stories/`](docs/stories/) | Story specs per `doccraft-story` |

## Development commands

```bash
pnpm run build        # Compile TS to dist/
pnpm run dev          # tsc --watch
pnpm run typecheck    # tsc --noEmit
pnpm run lint         # eslint src/
pnpm run test         # vitest run
pnpm run test:watch   # vitest (watch mode)
pnpm run dev:cli      # Build + run the local CLI
```

## Commits and releases

- **Conventional commits** enforced by commitlint
  ([`commitlint.config.js`](commitlint.config.js)).
- `feat:` / `feat(scope):` → minor bump.
- `fix:` / `fix(scope):` → patch bump.
- `feat!:` or a `BREAKING CHANGE:` footer → major bump (takes effect
  even at 0.x under this repo's semantic-release config).
- `docs:` / `chore:` / `refactor:` → no release bump.
- Semantic-release publishes to npm on push to `main`; no manual
  version bumping.

## Conventions to be aware of

- **`.claude/skills/` is the canonical install target.** Never write to
  `.cursor/skills/`. Rationale in
  [ADR 007](docs/adr/007-default-skill-install-to-claude-skills.md);
  supersedes the opt-in flag from
  [ADR 005](docs/adr/005-consolidate-skills-for-dual-tool.md).
- **OpenSpec is a subprocess**, not a library. doccraft forwards
  `--tools` verbatim; OpenSpec's install layout is its own concern.
- **Cursor 2.4+ required** when Cursor is in the user's tool selection
  (auto-discovers `.claude/skills/`). `doccraft init` prints a
  reminder.
- **`docs/config.yaml` is user-owned.** Doccraft scaffolds it once and
  never overwrites. Skill bodies read from it at invocation time with
  in-skill defaults as fallback (ADR 004).
