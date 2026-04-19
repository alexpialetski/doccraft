# ADR 009: `doccraft llm` command, JSON config with `version` stamp, and assisted setup/update skills

**Status:** Proposed (draft) — supersedes [ADR 008](008-doccraft-yaml-at-root-with-docsdir.md).

## Context

Three gaps surface once a project is past `doccraft init`:

**First-run config is opaque.** [ADR 008](008-doccraft-yaml-at-root-with-docsdir.md)
scaffolds `doccraft.yaml` with defaults, but a new user has no guided way
to discover what to tailor — story areas, slices, themes, id tiers, queue
thresholds. The file is user-owned (`doccraft update` never overwrites it,
per [ADR 004](004-docs-config-schema.md)), so the only hand-holding today
is the inline comments in the template. That is not enough.

**Migration between versions is silent.** There is no stamp in the config
file saying "this project was initialised with doccraft 0.X", so when
schema or skill shape changes in a later release, a user running
`doccraft update` has no guidance on what to review. We have no shipped
external customers yet (so backwards compatibility is not a hard
constraint), but the lack of a migration pathway is a cliff we will fall
off the first time we ship a breaking config change.

**YAML no longer earns its keep.** ADR 008 picked YAML largely for
inline comments. Once a dedicated skill (`doccraft-config`) owns the
authoring and walks users through the schema, inline comments become
redundant — worse, they're a second source of truth that can drift
from the skill's explanation. Dropping to JSON with a `"$schema"` key
gives native IDE validation, trivial surgical edits, and one canonical
shape for every tool (CLI, skill, editor) to consume.

Two adjacent facts shape the solution space:

- OpenSpec is bundled as a subprocess ([ADR 001](001-skill-install-pipeline.md)).
  `doccraft update` already runs `openspec update`, so upgrading doccraft
  transparently upgrades openspec. The mechanism exists; users just don't
  know it does.
- Skills should not assume doccraft is installed locally. `npx doccraft@latest`
  is the idiomatic invocation pattern for the update path and guarantees
  freshness of migration guidance without a project-side reinstall.

## Decision

### 1. Config format: `doccraft.json` with `$schema` and `version` stamp

Rename and rehome the config file:

- `doccraft.yaml` → `doccraft.json` at the project root.
- JSON, not YAML. No inline comments; a one-line `"_hint"` key at the
  top names the `doccraft-config` skill as the authoring tool.
- First two keys every scaffolded file carries:

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/doccraft@0.9.0/schema/doccraft.schema.json",
  "version": "0.9.0",
  "_hint": "Edit with the doccraft-config skill (npx doccraft@latest llm exposes the schema).",
  "docsDir": "docs",
  "story": { /* ... */ }
}
```

- `$schema` points at **jsDelivr**, pinned to the exact version that
  matches the `version` stamp. The schema is published inside the
  doccraft npm tarball; jsDelivr serves it automatically after every
  `npm publish` — no extra release step, no project-local schema file,
  no GitHub coupling.
- `doccraft update`'s surgical edit rewrites **both** `version` and
  the version segment of the `$schema` URL in one pass. They are kept
  byte-locked: a stale URL is the same failure mode as a stale stamp.
- IDEs (VS Code, JetBrains) fetch and cache the schema on first load.
  No project-local artefact; fresh clones get validation without
  running `doccraft init`.
- `version` is written by `doccraft init` on first scaffold.
  `doccraft update` performs a **surgical edit** — updates only that
  string value in place, preserving every other byte of the file
  (ordering, user values, the `_hint` text). No full rewrite.
- The rest of `doccraft.json` remains fully user-owned.

This supersedes [ADR 008](008-doccraft-yaml-at-root-with-docsdir.md).
Because there are no shipped customers, the rename is a clean break
rather than a migration entry — the `migrations` array for the
0.9 → 0.10 release ships empty.

### 2. `doccraft llm` as a single top-level command

One top-level command — no subcommands, no flags. A single invocation
returns a compact JSON manifest:

```json
{
  "version": "0.9.0",
  "bundledOpenspecVersion": "…",
  "schema": { /* JSON Schema for doccraft.json */ },
  "skills": [
    { "name": "doccraft-story", "purpose": "…one line…" },
    { "name": "doccraft-adr",   "purpose": "…one line…" }
  ],
  "migrations": [
    { "from": "0.9.x", "to": "0.10.0", "summary": "…", "steps": ["…"] }
  ]
}
```

Design intent:

- **Shape it like an MCP manifest.** Enough context for an LLM to decide
  what skill to reach for; never the skill body. Skill bodies live in
  `.claude/skills/` — not duplicated here.
- **`version` is a build-time placeholder.** A template string
  (e.g. `{{DOCCRAFT_VERSION}}`) substituted at bundle time from
  `package.json`. No runtime require of `package.json`, no separate
  subcommand to fetch it.
- **`schema` is the same JSON Schema published inside the package.** One
  source of truth (see section 3 below), emitted here verbatim.
- **`migrations` is sparse by design.** An entry exists **only** when a
  release requires user-assisted edits (new config key, renamed field,
  behavioural change a skill cannot auto-apply). Most releases ship with
  no migration entry and mean "run `doccraft update` and you're done."
  The expected steady state is a migrations array of length zero or one.

Keeping the surface tiny is deliberate. `npx doccraft@latest llm` should
return a payload small enough for a skill to inline into a prompt
without thinking about truncation.

### 3. Single schema source of truth — and it doubles as LLM context

The JSON Schema for `doccraft.json` lives as TypeScript source
(e.g. `src/utils/config-schema.ts`). At build time, the schema is:

- Emitted to `schema/doccraft.schema.json` inside the published
  npm tarball — which jsDelivr serves automatically at
  `https://cdn.jsdelivr.net/npm/doccraft@<version>/schema/doccraft.schema.json`
  (target of the `$schema` reference in scaffolded configs).
- Inlined into the `doccraft llm` output so the manifest is
  self-contained.
- Substituted into `templates/skills/doccraft-config/SKILL.md` via a
  template placeholder (e.g. `{{DOCCRAFT_CONFIG_SCHEMA}}`), so the
  skill body carries the same schema end-users' IDEs validate against.

**Every field carries rich JSON Schema metadata.** `title`,
`description`, and `examples` populate each property in the schema
source. This metadata has two audiences:

- **IDEs** render `description` as hover tooltips while editing
  `doccraft.json`; `examples` appear in autocompletion.
- **LLMs** (the `doccraft-config` skill, and any external tool that
  reads the manifest from `doccraft llm`) use the same descriptions to
  understand field intent without reading `SKILL.md` prose. The schema
  becomes self-documenting for both human editors and agent consumers.

Field descriptions are therefore not optional polish — they are part
of the schema contract, reviewed in the same PR as the shape.

One authoring source; three downstream consumers (IDE via jsDelivr,
CLI manifest, skill body). All derived from the same TS source by the
same build; zero drift. The skill never needs to call the CLI to
discover schema shape — it already has it.

### 4. Merge setup + config into one `doccraft-config` skill

Two modes, one skill:

- **Analyse mode** (first-run, post-`init`). Reads the project tree,
  proposes `doccraft.json` values with reasoning, walks the user through
  them, and applies once approved.
- **Edit mode** (ongoing). User asks for a specific change
  ("add `area:telemetry`"); skill validates against its embedded schema
  (section 3) and edits `doccraft.json` in place. No CLI call required —
  the version of the schema the skill knows is the version of doccraft
  the project is pinned to.

One skill, because configuration is one concern. A split into
`doccraft-setup` + `doccraft-config` creates two artefacts that share
prompts, schema knowledge, and approval flow — the gain is vocabulary,
not architecture.

### 5. New `doccraft-update` skill — silent by default

Reads `version` from `doccraft.json`, fetches the manifest via
`npx doccraft@latest llm`, and filters `migrations` for entries whose
range covers `local → latest`.

- **Dominant path (no matching entries).** Runs
  `npx doccraft@latest update`, which refreshes skills, rule stubs, and
  openspec transitively, then bumps the `version` stamp. No prompts, no
  summary — the skill reports what happened after the fact.
- **Assisted path (entries present).** Summarises the declared steps,
  gates on user approval, then runs update and bumps the stamp.

The skill treats "no migration entry = plain update" as the dominant
path. It does not invent migrations the manifest didn't declare, and
does not pause for confirmation when nothing needs human judgment.

### 6. Skills invoke via `npx doccraft@latest` for the update path only

`doccraft-update` calls `npx doccraft@latest` so migration guidance
always reflects the freshest release. `doccraft-config` does **not** —
configuration edits belong to the version the project is pinned to, and
reaching for `@latest` there would mean editing against a schema newer
than the installed doccraft.

## Consequences

- + First-run configuration becomes discoverable and assisted, not a
  mystery. New users get a guided pass instead of an inline-commented
  template and a shrug.
- + JSON + `$schema` gives IDE validation and completion out of the box,
  free of doccraft plumbing. A typo in `story.areas` lights up red
  immediately instead of surfacing inside a skill invocation.
- + One schema, one source. TS → npm-published schema + CLI manifest
  + skill body, all from the same build step. Field-level `title` /
  `description` / `examples` serve IDE tooltips and LLM context from
  the same strings. No drift.
- + No project-local schema file. Zero extra artefacts at the project
  root; fresh clones validate immediately via jsDelivr's cached copy.
- + Schema and skill changes can ship with structured migration notes;
  users get actionable guidance instead of silent drift.
- + `doccraft llm` cleanly separates deterministic facts (CLI) from
  judgment (skill). Third-party tools can consume the same surface.
- + Single-payload manifest is small enough to inline into a skill
  prompt. No client-side routing across subcommands; no decisions about
  which subject to call.
- + OpenSpec upgrades ride along on `doccraft update` — no separate
  contract to explain to users.
- + `npx @latest` pattern (update path only) sidesteps the "my skill
  is stale because someone pinned doccraft last year" failure mode.
- - `version` becomes a field the CLI must touch. Surgical edit adds
  code surface and an implicit invariant (never rewrite the file). The
  risk is small but real.
- - `doccraft llm` is a new public contract. Once skills depend on its
  output shape, breaking it becomes a migration of its own.
- - `npx @latest` adds per-invocation latency on `doccraft-update`.
  Acceptable because updates are infrequent and interactive.
- - JSON loses comments. Mitigations: the `_hint` key carries the one
  line of guidance users actually need; everything else moves into the
  skill, the published JSON Schema, and `$schema`-driven IDE tooltips.
- - ADR 008 is superseded on its first-anniversary — config format
  churns inside 0.x. Acceptable given zero shipped customers; this is
  the last format change we expect to make.
- - Two new skills land on top of the existing four. Skill count grows
  from four to six; this is the ceiling — further additions need a clear
  case.

## Alternatives considered

- **Three skills: `doccraft-setup`, `doccraft-config`, `doccraft-update`.**
  Rejected. Setup and config share every primitive (approval flow, schema
  knowledge, edit capability). Splitting them buys vocabulary, not
  architecture, and grows the skill surface past the point a user can
  hold it in their head.

- **`doccraft info --llm` flag instead of a top-level `llm` command.**
  Rejected. Flags modify a command's behaviour; this output is a
  distinct artefact (an LLM-facing manifest) and deserves its own verb.

- **Subcommands per payload slice (`llm schema`, `llm skills`,
  `llm migrations`).** Rejected. The full payload is small —
  schema is shallow, skill list is six entries of name + purpose, and
  migrations is zero or one entry in the steady state. Splitting into
  subcommands adds routing and documentation overhead for no savings,
  and forces skills to make multiple npx invocations to assemble the
  context they want.

- **Keep `doccraft.yaml`.** Rejected once comments were removed: YAML's
  remaining advantages (multiline strings, anchors) aren't exercised by
  this schema, and JSON gives native IDE validation through `$schema`.
  YAML also has no standard way to point at a validator, so IDE support
  always requires an extension.

- **`doccraft.toml`.** Rejected. TOML has comments and is more readable
  than JSON, but lacks the `$schema` convention and has weaker
  TypeScript/JSON-Schema ecosystem support. Gain is marginal; cost is a
  second parser.

- **Ship schema only through `doccraft llm`; skill fetches it every
  run.** Rejected. Forces the skill to call the CLI for something the
  installed package already knows — adds failure modes (no network, npx
  throttling) for a value that is pinned the moment `doccraft update`
  finishes.

- **Point `$schema` at `./node_modules/doccraft/schema/doccraft.schema.json`.**
  Rejected. Would require doccraft to be installed as a project
  devDependency, which contradicts the pure-npx stance — users should
  not have to pin and bump a dep just to get IDE validation on their
  config. Copying the schema into the project at init time is
  self-contained and offline-safe.

- **Project-local `doccraft.schema.json` copied at `init` time.**
  Rejected. Puts another doccraft-managed file at the project root
  purely for IDE tooling, which users pushed back on. jsDelivr serves
  the same bytes with no project-side footprint.

- **GitHub raw tag URL** (e.g.
  `https://raw.githubusercontent.com/<owner>/doccraft/v0.9.0/schema/doccraft.schema.json`).
  Works but couples IDE validation to the git host's raw-file serving
  (content-type quirks in some IDEs) and to the repo's public path.
  jsDelivr is purpose-built for this case and rides the npm publish
  pipeline we already use.

- **Diff the config schema at update time instead of stamping `version`.**
  Rejected. Diffing requires doccraft to infer "what version wrote this
  file" from its content — fragile once we add or remove fields. A
  stamp is one byte of metadata and avoids guessing.

- **Publish migration notes as a separate npm package.** Rejected.
  Migration notes belong with the release that introduces the change.
  Extra package adds release-coordination overhead for no gain.

- **Make doccraft a project dependency so skills call a local binary.**
  Rejected. The whole point of skills fetching via npx is to avoid pinned
  staleness. A local install adds a second source of truth for "what
  version of doccraft am I on" (installed vs. `doccraft.yaml` stamp) that
  will inevitably disagree.

## Follow-ups not in scope for this ADR

- Field-level shape of the manifest (exact key names, schema dialect,
  error channel). Design in the story and its OpenSpec change.
- Caching strategy for `npx doccraft@latest`. Defer until per-invocation
  latency is observable as a real problem.
- Whether `doccraft-config` in analyse mode should write a transcript of
  its reasoning to `docs/` for auditability. Nice-to-have, not core.
- Splitting the manifest into subcommands later if it grows past a size
  where inlining is awkward. Not foreseeable given the small surface.
