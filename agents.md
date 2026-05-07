# Pi Models Extension — Agent Context

A Pi extension (`npm:pi-models`) adding a `/models` command for browsing/switching AI models via cascading TUI overlays.

**Repo:** `github.com/apmantza/pi-models` | **License:** MIT

---

## Structure

Single-file extension: `pi-models.ts` (entry point, logic, TUI rendering).
`types.d.ts` — ambient declarations for Pi runtime modules.
No build step — Pi loads `.ts` directly.

### Runtime Deps (provided by Pi)

- `@earendil-works/pi-coding-agent` — `ExtensionAPI`, `ExtensionContext`, `ModelRegistry`
- `@earendil-works/pi-tui` — `Box`, `Text`, `Spacer`, `SelectList`, `truncateToWidth`, `visibleWidth`, `matchesKey`

### Dev Deps

`vitest`, `typescript`, `@types/node`

---

## Flow

```
/models → showModelsBrowser() → [By Provider | By Lab | By Model Family]
  → category list → model list → applyModelSelection() → pi.setModel()
```

"Free Models" is a virtual category always listed first.

---

## Key Exports (testable pure functions)

| Function                   | Purpose                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isModelFree(model)`       | Cost-based for pricing providers (`openrouter`, `opencode`, `kilo`, `cline`), name-based (`includes("free")`) otherwise                                                           |
| `getProviders(models)`     | Group by provider, sort alpha                                                                                                                                                     |
| `detectModelFamily(model)` | **Core heuristic** — keyword match on `id + name` → `{ familyId, familyName, lab }`. Strips `@cf/` prefix. Routers → `Other`. Provider fallbacks + version-prefixed ID fallbacks. |
| `getModelFamilies(models)` | Group by family, merge via `normalizeModelName()`                                                                                                                                 |
| `getLabs(models)`          | Group by lab/company                                                                                                                                                              |

**Order matters in `brandMappings`** — more specific patterns listed first (e.g., `codestral` before `mistral`).

---

## Pi API (key methods)

- `ctx.modelRegistry.getAvailable()` → `Model[]` (`id`, `name`, `provider`, `cost`)
- `ctx.modelRegistry.find(provider, id)` → `Model | undefined`
- `pi.setModel(model)` → `Promise<boolean>`
- `ctx.ui.custom<T>(factory, { overlay: true, overlayOptions: { width, anchor } })` → `Promise<T>`
- `ctx.ui.notify(message, type)`

---

## Dev Commands

```bash
npm run test        # vitest run
npm run test:watch  # vitest watch
npm run typecheck   # tsc --noEmit
```

Reload in Pi with `/reload` after changes.

---

## Adding a Model Family

1. Add `{ keywords, familyId, familyName, lab }` to `brandMappings` in `detectModelFamily()`
2. Specific before broad; add provider fallback if needed
3. Update README family table

---

## UI Components

- `showSelect()` — Level 1 overlay (`SelectList`, two-column layout with descriptions)
- `showModelList()` — Level 2 overlay (custom render, no columns, provider prefix when multi-provider)
- Both use dynamic width calculation, capped at 120 cols
- Blue background theme (`\x1b[48;2;0;20;137m`)

---

## Testing

Target the 6 exported pure functions with Vitest. `detectModelFamily()` should have the most coverage (one per family pattern + edge cases). No mocking needed for pure functions.
