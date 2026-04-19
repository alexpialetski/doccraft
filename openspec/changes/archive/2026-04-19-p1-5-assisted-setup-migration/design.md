## Context

doccraft ships four skills today and scaffolds a `doccraft.yaml` config file. Post-init, users have no guided tailoring, no version stamp, no migration pathway, and no IDE validation. The current stack: `src/utils/skills.ts` owns the YAML loader (`parseYaml` from the `yaml` npm package) and `scaffoldRootConfigIfMissing` which copies `templates/doccraft.yaml` into the project root. `src/cli/index.ts` wires `init` and `update`; there is no `llm` command. Two new skills are needed: `doccraft-config` and `doccraft-update`.

The change has a clear data-flow spine: one TypeScript source → emits JSON Schema to npm tarball → served by jsDelivr as `$schema` target AND inlined into `doccraft llm` output AND substituted into skill template. Every downstream consumer is derived; none is separately authored.

## Goals / Non-Goals

**Goals:**
- Replace `doccraft.yaml` with `doccraft.json` (clean break; no compat shim).
- Single JSON Schema source in `src/utils/config-schema.ts`, emitted to `schema/doccraft.schema.json` at build time.
- `{{DOCCRAFT_CONFIG_SCHEMA}}` placeholder substituted into `doccraft-config` skill template at install time.
- `{{DOCCRAFT_VERSION}}` placeholder substituted into CLI source at build time from `package.json`.
- `doccraft llm` command (no flags) emitting compact JSON manifest.
- `doccraft update` performs surgical edit of `version` + `$schema` URL.
- Two new skills (`doccraft-config`, `doccraft-update`) authored via `skill-creator`, installed by `runInit`/`runUpdate`.
- Dogfood `doccraft.yaml` → `doccraft.json` in this repo.
- README + CLAUDE.md updated.

**Non-Goals:**
- Dual-format support (YAML + JSON simultaneously).
- Caching `npx doccraft@latest llm` output.
- Writing config-analysis transcripts to `docs/`.
- Supporting doccraft as a project devDependency.
- Self-hosting the `$schema` URL (jsDelivr handles it).

## Decisions

### D1: JSON Schema source as TypeScript, emitted at build time

The schema is authored in `src/utils/config-schema.ts` as a plain TypeScript object conforming to JSON Schema draft-07. A build script (`scripts/emit-schema.ts`) writes it to `schema/doccraft.schema.json`. The `package.json` `files` array includes `schema/`.

**Why TS over JSON-in-repo:** TypeScript gives type safety, reuse in tests, and the ability to derive the schema object at runtime for the `doccraft llm` command. A separate `schema.json` checked into `src/` is a second source of truth.

**Why not `zod` + `zod-to-json-schema`:** Adds a dep; the schema is small and stable. A hand-authored TS object is legible and adds no build complexity.

### D2: `{{DOCCRAFT_VERSION}}` substituted at build time, not runtime

`src/commands/llm.ts` has a `DOCCRAFT_VERSION` constant set to the placeholder string. The build step (`scripts/emit-schema.ts` or a companion script) reads `package.json` and replaces the placeholder in the compiled `dist/commands/llm.js`. No runtime `require('../package.json')`.

**Why:** Avoids the `__dirname` / ESM `import.meta.url` dance for JSON files; compiled output is self-contained; the placeholder makes the substitution site obvious to a reader.

### D3: `{{DOCCRAFT_CONFIG_SCHEMA}}` substituted at install time by `installSkills`

When `installDoccraftSkills` copies `templates/skills/doccraft-config/SKILL.md` into `.claude/skills/`, it calls `applyDocsDir`-style substitution with the schema JSON embedded as a string. The schema is read from the built `schema/doccraft.schema.json` inside the package.

**Why install time (not build time):** The skill body is installed per-project. The schema content is baked into the npm tarball, so the substituted skill is always consistent with the version being installed. No extra indirection.

### D4: Surgical edit of `version` and `$schema` URL in `doccraft update`

`runUpdate` (or `installDoccraftSkills`) reads `doccraft.json`, finds the `"version"` value and the version segment inside the `"$schema"` URL using targeted string replacement (regex on the raw JSON bytes), and rewrites. It does **not** parse → mutate → serialize — that would reformat the file.

**Why regex over parse/serialize:** JSON serializers reorder keys, collapse whitespace, and strip trailing newlines. Surgical regex preserves every byte the user has not asked to change. The invariant: only two string values change; no other byte moves.

Pattern: `/"version"\s*:\s*"[^"]*"/` → `"version": "<newVersion>"` and `cdn.jsdelivr.net/npm/doccraft@<old>/` → `cdn.jsdelivr.net/npm/doccraft@<newVersion>/`.

### D5: `doccraft-config` skill uses embedded schema — no CLI call

The `{{DOCCRAFT_CONFIG_SCHEMA}}` substitution at install time means the skill body already contains the schema. It never calls `npx doccraft@latest`. Configuration edits target the version the project was initialised with — reaching for `@latest` schema would let the skill propose fields not in the installed version.

**Why:** Avoids per-invocation network latency and prevents schema drift between what the CLI validates and what the skill proposes.

### D6: `doccraft-update` skill calls `npx doccraft@latest llm` — no local dep

The update skill invokes `npx doccraft@latest llm` once to fetch the manifest, then invokes `npx doccraft@latest update`. Migration guidance must reflect the freshest release, not the installed version.

**Why:** The whole point of the skill is to give migration-aware updates. Using the local binary would mean "installed doccraft explains how to upgrade itself", which is not useful if the installed version is old.

### D7: Migrate `templates/doccraft.yaml` → `templates/doccraft.json`; remove `yaml` dep

The template root config becomes `templates/doccraft.json`. The `yaml` npm package is removed. `readDocsDirFromConfig` switches to `JSON.parse`. All template references to `doccraft.yaml` update.

**Why remove `yaml`:** Once YAML is gone from the config loader there is no other consumer in the codebase.

## Risks / Trade-offs

- [Surgical regex is fragile if the file uses unusual formatting] → Mitigation: test with hand-crafted `doccraft.json` fixtures that have irregular spacing, trailing commas (invalid JSON, caught by parse), and multi-line values. The regex targets quoted string values, which are unambiguous in valid JSON.
- [`{{DOCCRAFT_VERSION}}` substitution must survive minification] → Mitigation: the build uses `tsc` only (no minifier). The placeholder string is long and unique enough that accidental elision is not a concern.
- [jsDelivr availability] → Mitigation: IDE validation is a convenience, not a hard dependency. If jsDelivr is down, `doccraft.json` still works; only hover tooltips are missing.
- [`doccraft llm` shape becomes a public contract once skills parse it] → Mitigation: output fields are named (`version`, `schema`, `skills`, `migrations`), not positional. Adding fields is non-breaking; removing or renaming requires a migration entry.
- [Two new skills grows the skill count to six] → Mitigation: ADR 009 notes this is the ceiling. Document the constraint in CLAUDE.md.

## Migration Plan

1. Build pipeline change lands first (schema emit + placeholder substitution). No user-visible change.
2. Config format change: `templates/doccraft.yaml` → `templates/doccraft.json`; loader updated. Dogfood `doccraft.yaml` → `doccraft.json`. **BREAKING** for any user running off-main; none exist.
3. `doccraft llm` command wired to `src/cli/index.ts`.
4. Skill templates authored via `skill-creator` and placed in `templates/skills/`.
5. `runInit`/`runUpdate` extended to install new skills and apply `{{DOCCRAFT_CONFIG_SCHEMA}}` substitution.
6. Docs updated.

No compat shim. Release as a minor bump (new `llm` command + new skills = new capability; no user-visible removals until YAML is gone, which is the breaking part → semver major or accept as breaking minor at 0.x per the semantic-release config).

## Open Questions

- None blocking. jsDelivr URL format confirmed from ADR 009. Skill authoring deferred to implementation phase (skill-creator invocation).
