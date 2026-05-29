# Planning documentation

Central place for **backlog**, **queue**, **stories**, **ADRs**, plus
long-form **reference** and exploratory **research** docs. Authoring
skills live under [`.claude/skills/`](../.claude/skills/) (`doccraft-*`).

## Map

| Where | What |
|-------|------|
| [`backlog.md`](backlog.md) | Full prioritised backlog (P0–P4 tiers, Planned + Shipped sections) |
| [`queue.md`](queue.md) | Working queue — "what next", manual order, edited by hand |
| [`stories/`](stories/) | Product story specs (acceptance criteria, `depends_on`, `roadmap_ref`) |
| [`adr/`](adr/) | Architecture decision records (Nygard-style Context / Decision / Consequences) |
| [`reference/`](reference/README.md) | Long-form engineering notes — runbooks, architecture descriptions, evaluations |
| [`research/`](research/README.md) | Exploration and comparison notes that have not yet condensed into a decision |

## Skills overview

| Skill | Use for |
|-------|---------|
| `doccraft-story` | Authoring / updating product stories in [`stories/`](stories/) |
| `doccraft-adr` | Authoring / updating architecture decision records in [`adr/`](adr/) |
| `doccraft-queue-audit` | Reconciling the dependency graph, queue order, and backlog status |
| `doccraft-session-wrap` | Proposing what (if anything) is worth capturing from a chat thread |

## Getting started

1. **Record a decision** — ask your agent to "create an ADR for <decision>";
   it will invoke `doccraft-adr`.
2. **Track a story** — ask "create a story for <scope>"; it will invoke
   `doccraft-story`. The first time you do this, also tailor
   `doccraft.json` with `doccraft-config` so the vocabulary matches your
   project (areas, slices, themes, status, urgency, impact).
3. **After a story with `depends_on`** — ask "sanity-check the queue" to
   reconcile the dependency graph via `doccraft-queue-audit`.
4. **End of a design thread** — ask "wrap this session" for a proposal of
   what to capture via `doccraft-session-wrap`.

## Planning completion (ship checklist)

When implementation of a tracked item finishes (or is dropped), update
planning artifacts in one pass:

1. **Story** — `status: done` (or whichever terminal value your project
   uses; abandoned stories should record the reason in **Notes**); bump
   `updated:` if you use it.
2. **Backlog** — move the row from **`Px — Planned`** to
   **`Px — Shipped (reference)`** with `Status: done` and a ship date.
   Do not leave shipped rows in Planned. Keep the **Story files** index
   link unless you intentionally remove the story file.
3. **Queue** — remove or reorder the row in [`queue.md`](queue.md) if it
   was listed in **Suggested order**; ensure no `done` story stays at
   the top without intent.
4. **Dependents** — any story with `depends_on` containing this `id`:
   either the prerequisite is now satisfied (no edit) or adjust
   `depends_on` / **Notes** if the graph changed.
5. **Follow-up** — run `doccraft-queue-audit` if the graph or queue
   might be stale.

## Stories (`docs/stories/`)

Backlog items live as `stories/<slug>.md`. Authoritative story index:
[`backlog.md`](backlog.md) → **Story files** table.

- One file per story: Markdown with **YAML frontmatter** (see
  [`doccraft-story`](../.claude/skills/doccraft-story/SKILL.md) — the
  installed skill is the authoritative contract).
- **Flat layout** — no epic folders; use **prefixed tags** in
  frontmatter (`area:`, `slice:`, `theme:`) for grouping. The accepted
  values come from `story.areas`, `story.slices`, `story.themes` in
  `doccraft.json`.
- **Prioritisation** lives on the story: `impact`, `urgency`, optional
  `depends_on` (prerequisite story ids), optional `roadmap_ref` linking
  back to the backlog row. The accepted values for `impact`, `urgency`,
  and `status` come from the matching `story.*` enums in
  `doccraft.json` — add new values to the config rather than to story
  files.
- **`openspec` field:** `not-needed` | `recommended` | `required` —
  whether [OpenSpec](https://github.com/Fission-AI/OpenSpec)-style spec
  work is appropriate before implementation. No `openspec/` directory
  is required until you adopt that workflow.
- **Status** is updated **manually** — never inferred from git.
- **`adr_refs`** — list ADR filenames the story implements or
  contradicts. Cross-package projects use the namespaced form
  (`pkg-slug/NNN-slug.md`) per ADR 014 in the doccraft repo.

## ADRs (`docs/adr/`)

- Numbered files: `NNN-short-slug.md` (see [`adr/README.md`](adr/README.md)
  and the installed
  [`doccraft-adr`](../.claude/skills/doccraft-adr/SKILL.md) skill).
- **Nygard-style** sections: Context, Decision, Consequences;
  *Alternatives considered* when several options were evaluated.
- Use ADRs for accepted **and** rejected explorations so future sessions
  do not repeat the same analysis.
- **Never renumber** published ADRs; supersede instead. Status line
  records `Accepted` | `Superseded by NNN-other` | `Deprecated`.

## Cursor integration

When Cursor is in your tool selection, rule stubs auto-attach to the
matching docs:

| Artifact | Path | Attaches when editing |
|----------|------|------------------------|
| Story rule | `.cursor/rules/planning-stories.mdc` | `docs/stories/**` |
| ADR rule | `.cursor/rules/planning-adrs.mdc` | `docs/adr/**` |
| Queue rule | `.cursor/rules/planning-queue.mdc` | `docs/queue.md` |

The rules trigger the doccraft skills from `.claude/skills/`. Attaching
`@docs` (or the folder in Cursor) gives the model **file context**; it
does not replace the skills for procedures (story YAML, ADRs,
queue-audit).

## See also

- The installed `SKILL.md` files under `.claude/skills/` are the
  authoritative reference for each skill — they regenerate on
  `doccraft update`, your `doccraft.json` does not.
- [doccraft on npm](https://www.npmjs.com/package/doccraft)
