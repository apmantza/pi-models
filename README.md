# Pi Models Extension

A quality-of-life extension for [Pi](https://github.com/badlogic/pi-mono) that simplifies model browsing with a cascading menu interface.

## Features

- **Two-level cascading menu** - Select a provider first, then browse its models
- **Free models section** - All free models from any provider grouped at the top
- **Local model support** - Shows locally configured models (Ollama, LM Studio, etc.)
- **Quick switching** - Select any model to instantly switch to it

## Usage

Run `/models` in Pi to open the browser.

```
Level 1: Provider list          Level 2: Model list
┌─────────────────────┐         ┌─────────────────────────┐
│ 📦 Models           │         │ 📦 anthropic            │
│                     │   ──►   │                         │
│ 🆓 Free Models (5)  │         │ ● claude-sonnet-4       │
│ anthropropic (8)    │         │   claude-haiku-3        │
│ google (4)          │         │   claude-opus-4         │
│ openai (6)          │         │                         │
└─────────────────────┘         └─────────────────────────┘
```

- **Enter** - Select provider/model
- **Esc** - Go back (from level 2 to level 1) or close

## Installation

### Via settings.json (recommended)

Add to `~/.pi/agent/settings.json`:

```json
{
  "packages": ["npm:pi-models@latest"]
}
```

Pi will automatically download and load the extension. Run `/reload` to pick up changes.

### Via npm global install

```bash
npm install -g pi-models
```

Pi discovers extensions from global `node_modules`. Run `/reload` in Pi.

### Via GitHub (manual)

```bash
cd ~/.pi/agent/extensions
git clone https://github.com/apmantza/pi-models.git
```

Or copy just the file:

```bash
cp pi-models.ts ~/.pi/agent/extensions/
```

Run `/reload` in Pi.

## Requirements

- Pi v1.0+ with TypeScript extension support
- Models must have configured auth (API keys or local dummy keys like "ollama")
