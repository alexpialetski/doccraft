---
name: doccraft-update
description: >-
  Update the installed doccraft skills and openspec instructions to the latest
  release. Reads the version stamp from doccraft.json, fetches the migration
  manifest via npx doccraft@latest llm, and either updates silently (dominant
  path — no migration entries) or summarises and gates on approval (assisted
  path — migration entries present). Never fabricates steps the manifest did
  not declare.
---

> Managed by **doccraft** — `doccraft update` regenerates this file. Local edits will be overwritten. See `doccraft.json` to override project-specific vocabulary and paths without touching this file.

# doccraft — update skills and openspec instructions

## When to use

- Periodically to keep doccraft skills and openspec instructions current.
- After a teammate updates doccraft in a shared repo (check the version stamp
  in `doccraft.json` against the latest npm release).
- When `doccraft-config` or other skills mention features that do not seem to
  work — you may be running an older skill body.

## Configuration

Read `doccraft.json` at invocation. The `version` field is this skill's
primary input — it determines which migration entries apply. If the file is
missing, treat the local version as **unknown**, warn the user, and proceed.

Relevant keys:

- `version` — the currently installed doccraft version. Used to filter the
  migration manifest. Default: none (required; treat as unknown if absent).
- `docsDir` — root folder for all docs. Default: `docs`. Used post-update
  for context when checking extension fragments in installed skills.

## Workflow

### 1. Read the local version

Read `"version"` from `doccraft.json` at the project root. If the file does
not exist, treat the local version as **unknown** and warn the user — then
proceed.

### 2. Fetch the manifest

Run exactly once:

```
npx doccraft@latest llm
```

Parse the JSON output. The relevant fields are:
- `version` — the latest doccraft version.
- `migrations` — array of `{ from, to, summary, steps[] }` entries.

If the invocation fails (no network, npx error), report the error and stop.
NEVER guess at migration steps.

### 3. Filter migrations

Filter `migrations` to entries where the local version falls within the
`from` range and the latest version falls within the `to` range.

Treat `from` as a semver range (e.g. `"0.x"` covers `0.1.0`, `0.9.3`). If
you cannot parse the range, surface it as a step the user MUST review
manually rather than blocking the update.

### 4a. Dominant path — no matching entries

**If the filtered list is empty:**

1. Run: `npx doccraft@latest update`
   (The CLI handles the version bump in `doccraft.json` and installs skills
   and openspec instructions — no manual file edit needed.)
2. Report the new version and what was installed.
3. No prompt before running — this is the expected steady-state path.

### 4b. Assisted path — migration entries present

**If the filtered list is non-empty:**

1. Summarise each matching migration entry:
   - `summary` — one sentence.
   - `steps[]` — numbered list.
2. Ask for user approval before proceeding.
3. On approval:
   a. Run: `npx doccraft@latest update`
      (The CLI handles the version bump and skill install.)
   b. Report the new version and what was installed.
4. On rejection: stop. Do not run the update command.

## Constraints

- **NEVER fabricate migration steps** — only report what `migrations[]` in
  the manifest declares. If the array is empty, there are no user actions
  required.
- **Gate only when migration entries are present.** The dominant path (empty
  migrations) MUST run without prompting — that is the whole point.
- **Tolerate a missing `doccraft.json`** — continue with local version
  treated as unknown; warn the user and proceed.
- **One npx invocation for the manifest.** MUST NOT call
  `npx doccraft@latest llm` more than once per update run.
- **Trust the CLI for version bumps.** `npx doccraft@latest update`
  surgically updates `"version"` and `"$schema"` in `doccraft.json`
  automatically. MUST NOT duplicate that edit.

## Pre-execution validation

Before running the update, MUST complete these checks:

1. **Read existing config** — read `doccraft.json` in full before fetching
   the manifest. NEVER rely on memory or assumption for the local version.
2. **Manifest integrity** — confirm the `npx doccraft@latest llm` output
   contains the expected `version` and `migrations` fields. If the output
   is not valid JSON or missing these fields, report the parsing error and
   stop — NEVER proceed with a broken manifest.
3. **Latest version sanity** — confirm the manifest `version` is different
   from the local version. If they match, report "already up to date" and
   stop — no `npx doccraft@latest update` needed.
4. **Filtered migrations** — if any `from` range cannot be parsed, surface
   that entry for manual review rather than silently skipping or incorrectly
   including it.
5. **Network available** — if `npx doccraft@latest llm` fails with a
   network error, report the error and stop. NEVER cache and reuse an old
   manifest.

## Invalid examples (do not use)

- Fabricating migration steps when `migrations[]` is empty — NEVER; no
  entries means no manual steps are needed.
- Calling `npx doccraft@latest llm` more than once per update run — NEVER;
  cache the result in memory.
- Proceeding with the update when the manifest is unparseable — NEVER; stop
  and report the error.
- Manually editing `"version"` or `"$schema"` in `doccraft.json` after the
  CLI has run — NEVER; the CLI already performed the surgical edit.
- Running `npx doccraft@latest update` without user approval when migration
  entries are present — NEVER; gate on approval.
- Running `npx doccraft@latest update` when the local version already
  matches the latest — NEVER; report "already up to date" and stop.

## Done condition

The task is complete when:

- The manifest has been fetched and parsed from `npx doccraft@latest llm`
  exactly once.
- The local version has been compared against the latest version.
- In the dominant path: `npx doccraft@latest update` has run and the output
  confirms the new version plus installed components (skills refreshed,
  openspec version).
- In the assisted path: the user has either approved and the update has run
  (same as dominant path), or the user has rejected and no files were
  changed.
- The report includes the new version number and which components were
  refreshed.

## Workflow reminders

- If `doccraft.json` was missing before the update and the CLI did not
  scaffold it, invoke `doccraft init` to create the config file with the
  current version stamp.
- If `doccraft.json` declares an `extensions` array, verify the extension
  fragments were baked correctly by checking the injected blocks in
  `.claude/skills/*/SKILL.md` after the update.
- After a major or breaking-format update (semver jump), run
  `doccraft-queue-audit` if the project uses `docs/stories/` — new
  skill bodies may interpret frontmatter fields differently.
