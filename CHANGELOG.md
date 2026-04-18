# doccraft

## 0.1.9

### Patch Changes

- [`357b851`](https://github.com/alexpialetski/doccraft/commit/357b85182daf00c69122dd5601491ed6679feb3f) - Link the CHANGELOG file from the README. Also serves as the first end-to-end test of the automated release pipeline (Changesets → Version PR → npm publish).

## 0.1.8

### Patch Changes

- First published release under the current scaffold. Versions 0.1.0–0.1.7 were published and unpublished during earlier experimentation — those version numbers are permanently reserved by npm, so this scaffold starts at 0.1.8.
- Initial release: `doccraft init` and `doccraft update` (alias: `upgrade`) commands that wrap `openspec init` / `openspec update`. Skill templates will ship in the next release.
- Fix `bin` field so the `doccraft` CLI is exposed to the published package.
