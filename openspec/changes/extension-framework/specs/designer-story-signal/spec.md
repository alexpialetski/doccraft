## REMOVED Requirements

### Requirement: Story skill documents designer frontmatter guidance
**Reason**: ADR 013 removes the bundled design feature. The `designer:` story frontmatter field and its documentation in `doccraft-story` are removed from core. Audio-stage may re-introduce the field via an extension that targets `story.frontmatter.fields` and `story.instructions`.
**Migration**: Audio-stage authors `docs/.doccraft/extensions/design/extension.yaml` with a fragment that documents the `designer:` field at the `story.frontmatter.fields` injection point and a second fragment with the usage guidance at the `story.instructions` point. The core `doccraft-story` template ships without any `designer:` references.

### Requirement: Queue audit highlights required design readiness
**Reason**: Removed alongside the parent feature. The queue-audit skill no longer carries the design-readiness advisory in core.
**Migration**: Audio-stage's design extension MAY add advisory text at the `queue.instructions` injection point if it wants `doccraft-queue-audit` to surface a similar message. The contract is project-defined, not core-defined.

### Requirement: Non-design workflows remain unchanged
**Reason**: With the design feature removed from core, this guarantee becomes the default for every project that has not installed a design extension. No core-level requirement is needed to assert it.
**Migration**: None required.
