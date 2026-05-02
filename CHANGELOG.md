# Changelog

All notable changes to the Pi Models extension.

## [Unreleased]

### Added

- **New model families:** Added support for ByteDance (lab), Doubao (model family), Cohere (lab), Command (model family), Inclusion AI (lab), Ling (model family), Llada2 (model family), Ring (model family), Poolside (lab), and Laguna (model family) detection.
- **Fixed:** Ling model family now correctly mapped to Inclusion AI lab.

## [0.2.3] - 2026-04-24

### Added

- **New model families:** Added support for Hermes, Hy3, Lyria, and Qianfan model families.
- **Provider count in family view:** Shows how many providers offer each model family in the "By Model Family" view.

### Changed

- **Auto-resizing overlays:** Overlay screens now automatically resize to fit content width, preventing truncation of long model names.

## [0.2.2] - 2025-04-23

### Fixed

- **OpenAI o4 detection:** Added "o4" to the o-series keywords so models like "o4-mini" correctly group under the OpenAI lab instead of creating spurious lab entries.
- **By Lab view flow:** Removed the intermediate family selection step when browsing by lab. Now shows all models from the selected lab directly. Users who want family filtering can use "By Model Family" view instead.

## [0.2.1] - 2025-04-03

### Fixed

- **Ollama family grouping:** Removed special `ollama-` prefix handling. Ollama models now correctly group with their brand families (e.g., `ollama/llama3.2` → Llama family, `ollama/qwen2.5` → Qwen family) instead of creating separate `ollama-*` families per model.

### Added

- **Name-based family merging:** Models with the same normalized name from different providers are automatically merged into the same family. For example, `Trinity Large Preview` from zen, kilo, and cline providers all group together under the Arcee family.
- **Arcee/Trinity model family:** Added support for Arcee AI's Trinity model series.
- **Mistral model family:** Added support for Mistral AI models.
- **Router model grouping:** Router/auto models (e.g., `kilo-auto/free`, models with "router" or "auto" in the name) are now grouped into an "Other" family instead of cluttering the main family list.
- **Complete test suite:** Added 60 comprehensive tests covering all model family detection patterns, grouping logic, and edge cases.

### Changed

- Updated `.npmignore` to exclude development files from published package.
- Updated `package.json` with proper metadata, scripts, and devDependencies.

## [0.2.0] - 2025-04-02

### Added

- **Browse mode selection:** Choose between "By Provider" and "By Model Family" views.
- **By Model Family view:** Navigate by model type (Claude, GPT-4, Llama) then select provider.
- **Automatic model family detection:** Heuristic pattern matching groups models by brand.
- **Multi-provider selection:** When the same model is available from multiple providers, choose which one to use.
- **Dynamic column sizing:** Model names are no longer truncated.
- **Wider overlays:** Better visibility for long model names.
- **Free Models in both views:** Accessible from either browse mode.

### Changed

- Major refactor of the UI with two-level cascading menus.
- Improved provider grouping logic.

## [0.1.0] - 2025-03

### Added

- Initial release.
- Two-level provider → model browsing.
- Free Models virtual provider.
- Local model support (Ollama).
- Basic model switching via `/models` command.

---

[0.2.3]: https://github.com/apmantza/pi-models/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/apmantza/pi-models/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/apmantza/pi-models/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/apmantza/pi-models/releases/tag/v0.2.0
[0.1.0]: https://github.com/apmantza/pi-models/releases/tag/v0.1.0
