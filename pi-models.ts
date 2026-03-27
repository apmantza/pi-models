/**
 * Pi Models Extension
 *
 * Two-level menu: pick a provider, then pick a model.
 * "Free Models" is always listed first as a virtual provider.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, Spacer, Text } from "@mariozechner/pi-tui";

interface ModelInfo {
	id: string;
	name?: string;
	provider: string;
	isFree: boolean;
	inputCost: number;
	outputCost: number;
}

function isModelFree(model: { cost?: { input: number; output: number } }): boolean {
	if (!model.cost) return true;
	return model.cost.input === 0 && model.cost.output === 0;
}

function getAvailableModels(ctx: ExtensionContext): ModelInfo[] {
	return ctx.modelRegistry.getAvailable().map((m) => ({
		id: m.id,
		name: m.name,
		provider: m.provider,
		isFree: isModelFree(m),
		inputCost: m.cost?.input ?? 0,
		outputCost: m.cost?.output ?? 0,
	}));
}

function formatModelName(model: ModelInfo): string {
	return model.name && model.name !== model.id ? model.name : model.id;
}

interface Provider {
	id: string;
	name: string;
	models: ModelInfo[];
	freeCount: number;
}

function getProviders(models: ModelInfo[]): Provider[] {
	const byProvider = new Map<string, ModelInfo[]>();
	for (const m of models) {
		const existing = byProvider.get(m.provider) ?? [];
		existing.push(m);
		byProvider.set(m.provider, existing);
	}

	const providers: Provider[] = [];
	for (const [id, models] of byProvider) {
		providers.push({
			id,
			name: id,
			models: models.sort((a, b) => a.id.localeCompare(b.id)),
			freeCount: models.filter((m) => m.isFree).length,
		});
	}
	return providers.sort((a, b) => a.id.localeCompare(b.id));
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("models", {
		description: "Browse and select models",
		handler: async (_args, ctx) => {
			await showModelsBrowser(pi, ctx);
		},
	});
}

async function showModelsBrowser(pi: ExtensionAPI, ctx: ExtensionContext) {
	while (true) {
		const allModels = getAvailableModels(ctx);
		const providers = getProviders(allModels);
		const freeModels = allModels.filter((m) => m.isFree).sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));

		// Level 1: Provider selection
		const providerItems: SelectItem[] = [
			{ value: "__free", label: "🆓 Free Models", description: `${freeModels.length} models` },
		];
		for (const p of providers) {
			const desc = p.freeCount > 0 ? `${p.models.length} models (${p.freeCount} free)` : `${p.models.length} models`;
			providerItems.push({ value: p.id, label: p.name, description: desc });
		}

		const selectedProvider = await showSelect(ctx, "📦 Models", providerItems);
		if (!selectedProvider) return;

		// Build model list based on selection
		let modelItems: SelectItem[];
		let sectionTitle: string;

		if (selectedProvider === "__free") {
			sectionTitle = "🆓 Free Models";
			modelItems = freeModels.map((m) => ({
				value: `${m.provider}/${m.id}`,
				label: formatModelName(m),
				description: `@ ${m.provider}`,
			}));
		} else {
			const provider = providers.find((p) => p.id === selectedProvider);
			if (!provider) continue;
			sectionTitle = `📦 ${provider.name}`;
			modelItems = provider.models.map((m) => {
				const costStr = m.isFree ? "free" : `$${m.inputCost}/$${m.outputCost}/1M`;
				const isActive = m.id === ctx.model?.id;
				return {
					value: `${m.provider}/${m.id}`,
					label: isActive ? `● ${formatModelName(m)}` : formatModelName(m),
					description: isActive ? `active • ${costStr}` : costStr,
				};
			});
		}

		if (modelItems.length === 0) {
			ctx.ui.notify("No models in this category", "info");
			continue;
		}

		// Level 2: Model selection (Esc goes back to level 1)
		const selectedModel = await showSelect(ctx, sectionTitle, modelItems);
		if (!selectedModel) continue; // Esc pressed - go back to level 1

		// Apply selection
		const slashIndex = selectedModel.indexOf("/");
		if (slashIndex === -1) continue;

		const model = ctx.modelRegistry.find(selectedModel.slice(0, slashIndex), selectedModel.slice(slashIndex + 1));
		if (!model) {
			ctx.ui.notify(`Model not found`, "error");
			continue;
		}

		const success = await pi.setModel(model);
		ctx.ui.notify(success ? `Switched to ${model.name || model.id}` : `No API key for ${model.provider}`, success ? "info" : "error");
		return;
	}
}

async function showSelect(ctx: ExtensionContext, title: string, items: SelectItem[]): Promise<string | null> {
	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const container = new Container();
			container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
			container.addChild(new Spacer(1));

			const selectList = new SelectList(items, Math.min(items.length, 15), {
				selectedPrefix: (t: string) => theme.fg("accent", t),
				selectedText: (t: string) => theme.fg("accent", t),
				description: (t: string) => theme.fg("muted", t),
				scrollInfo: (t: string) => theme.fg("dim", t),
				noMatch: (t: string) => theme.fg("warning", t),
			});

			selectList.onSelect = (item: SelectItem) => done(item.value);
			selectList.onCancel = () => done(null);
			container.addChild(selectList);

			container.addChild(new Spacer(1));
			container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc back"), 1, 0));

			return {
				render: (w: number) => container.render(w),
				invalidate: () => container.invalidate(),
				handleInput: (data: string) => selectList.handleInput(data),
			};
		},
		{ overlay: true, overlayOptions: { width: "50%", minWidth: 40, anchor: "center" } }
	);
}
