# ADR 006: doccraft owns tool selection in init; forwards `--tools` to openspec

**Status:** Accepted

## Context

The first-contact UX for `npx doccraft init` routed tool selection
through openspec's interactive picker, which offers all 28 tools it
supports (Amazon Q, Antigravity, Auggie, Bob Shell, Cline, Codex, …).
doccraft brands itself as "Claude Code + Cursor", so users expected a
narrow choice from doccraft itself — not openspec's full catalog as
the first interactive moment of the install.

Root cause: doccraft forwarded `--tools` to openspec *only when* the
user had passed it. Without a flag (the default `npx doccraft init`
path), openspec's own prompt fired, then doccraft silently detected
whatever tool dir openspec had created.

## Decision

doccraft owns tool selection. Every `doccraft init` run resolves a
canonical tools string before any subprocess runs, then passes that
string to openspec and to `installDoccraftSkills`.

Resolution precedence:

1. `--tools <value>` explicit → validate + canonicalize (expand
   `all`, lowercase, dedupe).
2. No flag + stdin is a TTY → prompt with 3 choices scoped to
   doccraft's targets: **Claude Code**, **Cursor**, **Both**.
3. No flag + non-interactive (piped input, CI) → default to both
   supported tools.

`--tools all` in doccraft means "all doccraft-supported tools". Before
forwarding to openspec, `all` is expanded to the explicit list
`claude,cursor` so openspec does not interpret it as its 28-tool
catalog. Same strings (explicit ids) mean the same set of tools in
both layers.

After resolution, the canonical value is echoed on one line (`Tools:
Claude Code, Cursor`) so users see what was selected before any
install work runs.

`doccraft update` deliberately keeps its existing detect-existing-
install default. Update runs against a project that already has
`.claude/` or `.cursor/` on disk; asking the user to re-pick tools
on every update would be friction, not clarity.

## Consequences

- + First-contact UX matches doccraft's brand surface. Users see
  a 3-option choice, not a 28-option list.
- + The two halves of an install (openspec + doccraft skills) are
  now guaranteed to see identical tool lists. No more ordering
  dependency where doccraft had to wait for openspec to create a
  tool directory before detecting it.
- + `--tools all` is defined consistently across doccraft-authored
  and openspec-authored layers.
- + Tool selection is uniformly visible: it prints before any
  subprocess starts, so a script author running under `--force`
  still sees what happened.
- - New direct dependency on `@inquirer/select` (~60 KB installed).
  Considered acceptable; the alternative (re-rolling a select
  prompt via readline) is more code and worse UX.
- - Users who specifically *wanted* openspec's full 28-tool picker
  must now pass `--tools <value>` explicitly or run `openspec init`
  directly. Acceptable — that was always a workflow, not a default.
- - Adding a new doccraft-supported tool now requires updating the
  prompt's choices list. Mechanical; tests catch drift.

## Alternatives considered

- **Default to both supported tools, no prompt.** Simpler, one-line
  change. Rejected because the user explicitly asked for a 2-or-3
  option choice — surprise defaults are worse than a quick prompt
  for a command users run once per project.
- **Expose `--tools` as a required flag.** Forces `npx doccraft init`
  to fail without args. Rejected — bad UX for first-time users who
  expect a zero-config start.
- **Let openspec continue driving tool selection.** Status quo.
  Rejected; this ADR exists because the status quo was the bug.
- **Render doccraft's picker in terms of openspec's tool ids.**
  Considered briefly. Rejected: tying the picker to openspec's
  catalog shape defeats the containment that scoping to 3 choices
  provides.

## Follow-ups not in scope for this ADR

- Symmetrical picker for `doccraft update` if detect-existing starts
  mis-firing in practice. No signal today that it does.
- An analogous `--consolidate` flag (ADR 005 / P1.2) uses the same
  resolved tools string; no extra integration work beyond passing
  the value through.
