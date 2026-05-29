## REMOVED Requirements

### Requirement: LlmManifest declares a migration entry for story.modelHints
**Reason**: The `story.modelHints` config field is removed by this change (see `json-config` delta). The migration entry advertising it is removed in lockstep; it would point at a field that no longer exists in the schema.
**Migration**: Audio-stage carries the model-hints behaviour as an extension under `docs/.doccraft/extensions/model-hints/`. No `LlmManifest` entry is published for the extension — extension migration is a one-shot manual step coordinated with the ADR 013 breaking release.

### Requirement: doccraft update creates the registry file when the migration is approved
**Reason**: The auto-seed of `templates/docs/reference/model-hints.md` is removed alongside the `story.modelHints` field. The extension `scaffold[]` mechanism replaces this behaviour for any project that wants the registry file.
**Migration**: Audio-stage's model-hints extension declares a `scaffold[]` entry that copies the registry markdown into place with the same never-overwrite semantics. `doccraft update` invokes the extension scaffold step automatically; no migration prompt is required.

### Requirement: doccraft update does not prompt outside the manifest channel for model hints
**Reason**: With `story.modelHints` removed, the model-hints-specific prompt path no longer exists. The non-interactivity guarantee is implicitly satisfied by the absence of any model-hints-aware code in `doccraft update`.
**Migration**: None required.
