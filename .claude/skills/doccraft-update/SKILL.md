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

# doccraft — update

## When to use

- Periodically to keep doccraft skills and openspec instructions current.
- After a teammate updates doccraft in a shared repo (check the version stamp
  in `doccraft.json` against the latest npm release).
- When `doccraft-config` or other skills mention features that don't seem to
  work — you may be running an older skill body.

## Steps

### 1. Read the local version

Read `"version"` from `doccraft.json` at the project root.
If the file does not exist, treat the local version as **unknown** and warn
the user — then proceed.

### 2. Fetch the manifest

Run exactly once:

```
npx doccraft@latest llm
```

Parse the JSON output. The relevant fields are:
- `version` — the latest doccraft version.
- `migrations` — array of `{ from, to, summary, steps[] }` entries.

If the invocation fails (no network, npx error), report the error and stop.
Do not guess at migration steps.

### 3. Filter migrations

Filter `migrations` to entries where the local version falls within the
`from` range and the latest version falls within the `to` range.

Treat `from` as a semver range (e.g. `"0.x"` covers `0.1.0`, `0.9.3`).
If you cannot parse the range, surface it as a step the user should review
manually rather than blocking the update.

### 4a. Dominant path — no matching entries

**If the filtered list is empty:**

1. Run: `npx doccraft@latest update`
2. Bump `"version"` in `doccraft.json` to the latest version (surgical edit
   of the `"version"` string and the version segment of `"$schema"` URL only).
3. Report what was installed (skills refreshed, openspec version).
4. No prompt before running — this is the expected steady-state path.

### 4b. Assisted path — migration entries present

**If the filtered list is non-empty:**

1. Summarise each matching migration entry:
   - `summary` — one sentence.
   - `steps[]` — numbered list.
2. Ask for user approval before proceeding.
3. On approval:
   a. Run: `npx doccraft@latest update`
   b. Bump the `"version"` stamp (same surgical edit as 4a).
   c. Report what was installed.
4. On rejection: stop. Do not run the update command.

## Constraints

- **Never fabricate migration steps** — only report what `migrations[]` in
  the manifest declares. If the array is empty, there are no user actions
  required.
- **Gate only when migration entries are present.** The dominant path (empty
  migrations) must run without prompting — that is the whole point.
- **Tolerate a missing `doccraft.json`** — continue with local version
  treated as unknown; warn the user and proceed.
- **One npx invocation for the manifest.** Do not call `npx doccraft@latest
  llm` more than once per update run.
