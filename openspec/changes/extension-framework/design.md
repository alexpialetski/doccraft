## Context

doccraft's skill install pipeline (`src/utils/skills.ts` → `installSkills`)
currently performs three independent template substitutions in fixed order:

1. `{{DOCCRAFT_CONFIG_SCHEMA}}` (for `doccraft-config` only)
2. `{{BUSINESS_INTEGRATION_BLOCK}}` (replaced with one of two hardcoded
   string literals depending on which skill is being installed, or stripped)
3. `{{MODEL_HINTS_INTEGRATION_BLOCK}}` (replaced with a string template
   that has `<PATH>` substituted, or stripped)
4. `{{DOCS_DIR}}` (replaced everywhere with the value of `docsDir`)

Skill install also gates on a `feature:` frontmatter field — when present,
the skill is only installed if the named feature is in `doccraft.json.features`.

ADR 013 generalises substitutions 2 and 3 (and the feature gate) into a
single declarative mechanism. ADR 014 plans to ride on top of the same
mechanism for monorepo package-list injection — designing the marker and
baker to be open-ended now avoids rework when ADR 014 lands.

The only consumer is audio-stage, which has explicitly opted into a
breaking change. No backwards-compatibility shims are required.

## Goals / Non-Goals

**Goals:**
- One declarative manifest format for all opt-in skill-body extensions
  and any associated `docs/` scaffolding.
- Bake-at-update lifecycle — installed skills under `.claude/skills/`
  remain self-contained markdown, no runtime extension-loading.
- Deterministic output: byte-identical SKILL.md across runs when input
  (templates + extensions + config) is unchanged.
- Hard errors at update time for malformed manifests, unknown injection
  points, or missing fragment files. No silent fallbacks.
- Extension marker mechanism reusable for ADR 014's
  `<!-- doccraft:packages -->` baked package list (don't paint into a
  corner).

**Non-Goals:**
- Runtime fragment reading by skills at invocation. Bake-only.
- Per-extension semver, dependency resolution, or lockfiles. Extensions
  are project-local directories; the user manages them by hand.
- Lifecycle hooks beyond `update`. No pre/post install, no test runner,
  no extension-supplied executables.
- Discovery / a registry / publishing flow. Extensions are referenced by
  filesystem path in `doccraft.json`.
- Migration tooling for audio-stage. That migration is a separate
  change in the audio-stage repo, manual and one-shot.
- Backwards compatibility with `features: ["business" | "design"]`. The
  schema removal is hard — old configs fail validation, by design.

## Decisions

### 1. Manifest format — YAML at `extension.yaml`

Match the format used elsewhere (`openspec/config.yaml`, frontmatter).
Schema:

```yaml
name: <string, required>            # human-readable extension name
version: <string, optional>         # informational only; not enforced
injects:                            # optional
  - skill: <string, required>       # e.g. "doccraft-story"
    point: <string, required>       # e.g. "story.instructions"
    fragment: <path, required>      # path to markdown fragment, relative to extension dir
scaffold:                           # optional
  - source: <path, required>        # path to source tree, relative to extension dir
    target: <path, required>        # destination path, relative to project root
```

**Alternatives considered:**
- JSON — rejected for consistency with the YAML-shaped surfaces users
  already edit (frontmatter, openspec).
- Single-file extensions (fragments live directly in `extension.yaml`)
  — rejected; fragments are markdown and benefit from rendering as
  separate files in editors and git diffs.

### 2. Marker syntax — HTML comments with named attributes

```markdown
<!-- doccraft:inject point=story.instructions -->
<!-- /doccraft:inject -->
```

HTML comments are valid markdown (render as nothing), grep-able with a
single regex, support an `name=value` attribute syntax, and are visually
distinct from the existing `{{XYZ}}` placeholders (which remain only
for `{{DOCS_DIR}}` and `{{DOCCRAFT_CONFIG_SCHEMA}}` — those are
one-shot substitutions, not multi-fragment concatenations).

Open/close pairs are required (not a single self-closing marker) so the
baker can strip both the marker and any whitespace between them when no
extension targets the point. This avoids the empty-trailing-newline
artefact that ADR 011's design already had to call out (story-model-hints
spec scenario 2).

The same marker mechanism is forward-compatible with ADR 014:
`<!-- doccraft:packages -->` will use the same parser, dispatching to a
package-list renderer instead of an extension-fragment concatenator. The
generalised form is `<!-- doccraft:<directive> <attrs?> -->`.

**Alternatives considered:**
- `{{INJECT:story.instructions}}` — rejected; collides visually with
  the one-shot `{{XYZ}}` substitutions and doesn't support a closing
  marker for whitespace control.
- A magic comment in a separate file — rejected; the marker has to be
  in the skill body where the content goes, full stop.

### 3. Injection-point taxonomy — enumerated, validated at update

```
story.frontmatter.fields
story.body.sections
story.instructions
adr.frontmatter.fields
adr.body.sections
adr.instructions
queue.instructions
queue.artifact-types
session-wrap.artifact-types
session-wrap.instructions
```

The valid set is a static list in `src/utils/extensions.ts`. Unknown
points in an `extension.yaml` are a hard error at update with a clear
message listing the valid points.

**Why enumerated, not open-ended:** the marker must exist in the
template body for the injection to land anywhere. Allowing arbitrary
point names lets extensions silently no-op when they target a marker
that doesn't exist. Enumerated points + hard error catches typos.

Adding a new point is a minor version bump (new marker in a template,
new entry in the static list). Removing one is major (breaks any
extension targeting it). Acceptable — the list is small and stable.

### 4. Fragment composition — concatenated in declaration order

Multiple extensions may target the same `(skill, point)` pair. Fragments
are concatenated in the order extensions appear in
`doccraft.json.extensions`, with a single blank line between
contributions. The replacement region is everything between the open
and close marker, inclusive of leading/trailing newlines that would
otherwise leave gaps.

If no extension targets a marker, the open/close pair is stripped
entirely (along with one trailing newline) so unused points leave no
whitespace artefact in the baked skill.

**Alternatives considered:**
- Priority field per inject entry — rejected; declaration order in
  `doccraft.json.extensions` is already the user-visible knob, adding a
  second one is confusing.
- Merge semantics for `frontmatter.fields` (parse, dedupe, re-emit) —
  rejected for v1. Fragments are appended; if two extensions add the
  same field, last wins on duplicate-key YAML parse. Worth revisiting
  if it becomes a real problem.

### 5. Scaffold semantics — never-overwrite, post-bake

Scaffold runs after skill bake, before `scaffoldDocsIfMissing` (so a
project's own `docs/README.md` from `templates/docs/` doesn't get
shadowed by an extension's stray `docs/README.md` — extensions should
not be scaffolding into root paths that core templates own, but if they
do, core wins).

Existing files are preserved verbatim. Directories are walked
recursively. This mirrors the existing `scaffoldDocsIfMissing` helper —
single implementation, shared between core and extensions.

### 6. Error semantics — fail loudly at update

Every error condition is a hard exit at `doccraft update` with a
specific message:

| Condition | Error |
|-----------|-------|
| Path in `extensions[].path` does not exist | `extension not found: <path>` |
| `extension.yaml` missing | `extension manifest missing: <path>/extension.yaml` |
| Manifest fails schema validation | `invalid extension manifest at <path>: <field> <reason>` |
| `injects[].skill` is not a known doccraft skill | `unknown skill in <name>: <skill>` |
| `injects[].point` is not in the enumerated set | `unknown injection point in <name>: <point>. Valid: ...` |
| `injects[].fragment` path does not exist | `fragment not found in <name>: <fragment>` |
| `scaffold[].source` path does not exist | `scaffold source not found in <name>: <source>` |

No silent fallbacks. Users see the problem and fix it.

### 7. Skill subset — only the four core doccraft skills accept injections

`doccraft-config` and `doccraft-update` do not have injection points in
v1. They are infrastructure skills (config schema rendering, update
flow) that should not be extended without an explicit design decision.
Future ADRs can add points to them if needed.

### 8. Documentation skill — `doccraft-extension` author guide is **not** in scope

A separate skill that authors `extension.yaml` and fragment files could
be useful for audio-stage to reduce hand-editing. Not in this change.
Add later if audio-stage finds it painful.

## Risks / Trade-offs

- **Risk:** audio-stage's existing business/design integration breaks the
  moment this lands; user must complete the audio-stage migration in
  the same session or the project is non-functional. → **Mitigation:**
  audio-stage migration is the immediate follow-up; this change does
  not ship to audio-stage until both are ready. Coordinate via a
  feature branch in this repo until audio-stage's migration PR is also
  ready.

- **Risk:** the injection-point taxonomy is locked in by the first set
  of audio-stage extensions; adding/removing points later is breaking.
  → **Mitigation:** the v1 list is short and was derived from ADR 013's
  motivating examples plus the drift audit. Treat it as a contract; new
  points require explicit ADRs going forward.

- **Risk:** scaffold collisions between core templates and extensions
  go undetected because both use never-overwrite — first writer wins,
  silently. → **Mitigation:** scaffold runs after core templates, so
  core templates always win when paths collide. If a user wants an
  extension to seed `docs/README.md`, they must delete the core
  scaffold first. Document this ordering.

- **Trade-off:** bake-time means extension edits require `doccraft
  update`. Users may edit a fragment expecting the change to take
  effect immediately. → **Mitigation:** the existing
  `Managed by doccraft — doccraft update regenerates this file` header
  already trains users to think in terms of update. Extension fragments
  are not managed files; they're sources. The baked skill body in
  `.claude/skills/` is where the warning applies, unchanged.

- **Trade-off:** removing `story.modelHints` and the auto-seed of
  `templates/docs/reference/model-hints.md` means new projects scaffolded
  via `doccraft init` no longer get the registry skeleton. → **Mitigation:**
  audio-stage carries it as an extension scaffold; new projects that want
  model hints can copy audio-stage's extension as a starting point. The
  template file itself stays in the repo as a reference under
  `templates/docs/reference/` until removed in a follow-up template
  refresh.

## Migration Plan

This change has no in-product migration tooling. The path is:

1. Land this change in doccraft (new minor or major version — likely a
   major bump given breaking removals).
2. In audio-stage, on the same day:
   - Delete `features: ["business", "design"]` from `doccraft.json`.
   - Author `docs/.doccraft/extensions/business/extension.yaml` and
     fragments by copying the deleted `BUSINESS_BLOCK_*` literals and
     the deleted `templates/skills/doccraft-business/SKILL.md` content.
   - Author `docs/.doccraft/extensions/model-hints/extension.yaml` and
     fragments if model hints is still wanted (likely yes).
   - Wire designer-skills install via audio-stage's own scripts (not
     doccraft's concern anymore).
   - Add `extensions: [...]` array to `doccraft.json` listing the new
     extension paths.
   - Run `doccraft update` to verify the baked skills match prior
     behaviour.
3. There is no rollback. If audio-stage's migration breaks, fix forward.

## Open Questions

None blocking implementation. Decisions above are firm; the only firm
follow-up is "should `doccraft-config` and `doccraft-update` accept
injections in v2?" — deferred until a real need surfaces.
