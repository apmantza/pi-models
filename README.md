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

Copy `pi-models.ts` to your Pi extensions folder:

```bash
# Global (all projects)
cp pi-models.ts ~/.pi/agent/extensions/

# Or project-local
cp pi-models.ts .pi/extensions/
```

Then run `/reload` in Pi.

## Requirements

- Pi v1.0+ with TypeScript extension support
- Models must have configured auth (API keys or local dummy keys like "ollama")
