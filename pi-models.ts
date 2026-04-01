/**
 * Pi Models Extension
 *
 * Two-level menu: pick a provider, then pick a model.
 * "Free Models" is always listed first as a virtual provider.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
	Container,
	matchesKey,
	type SelectItem,
	SelectList,
	Spacer,
	Text,
	visibleWidth,
} from "@mariozechner/pi-tui";

interface ModelInfo {
	id: string;
	name?: string;
	provider: string;
	isFree: boolean;
	inputCost: number;
	outputCost: number;
}

function isModelFree(model: {
	cost?: { input: number; output: number };
}): boolean {
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
		const freeModels = allModels
			.filter((m) => m.isFree)
			.sort(
				(a, b) =>
					a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id),
			);

		// Level 1: Provider selection
		const providerItems: SelectItem[] = [
			{
				value: "__free",
				label: "🆓 Free Models",
				description: `${freeModels.length} models`,
			},
		];
		for (const p of providers) {
			const desc =
				p.freeCount > 0
					? `${p.models.length} models (${p.freeCount} free)`
					: `${p.models.length} models`;
			providerItems.push({ value: p.id, label: p.name, description: desc });
		}

		const selectedProvider = await showSelect(ctx, "📦 Models", providerItems);
		if (!selectedProvider) return;

		// Build model list based on selection
		let modelItems: ModelInfo[];
		let sectionTitle: string;

		if (selectedProvider === "__free") {
			sectionTitle = "🆓 Free Models";
			modelItems = freeModels;
		} else {
			const provider = providers.find((p) => p.id === selectedProvider);
			if (!provider) continue;
			sectionTitle = `📦 ${provider.name}`;
			modelItems = provider.models;
		}

		if (modelItems.length === 0) {
			ctx.ui.notify("No models in this category", "info");
			continue;
		}

		// Level 2: Model selection (custom component without column truncation)
		const selectedModelId = await showModelList(ctx, sectionTitle, modelItems);
		if (!selectedModelId) continue; // Esc pressed - go back to level 1

		// Apply selection
		const slashIndex = selectedModelId.indexOf("/");
		if (slashIndex === -1) continue;

		const model = ctx.modelRegistry.find(
			selectedModelId.slice(0, slashIndex),
			selectedModelId.slice(slashIndex + 1),
		);
		if (!model) {
			ctx.ui.notify(`Model not found`, "error");
			continue;
		}

		const success = await pi.setModel(model);
		ctx.ui.notify(
			success
				? `Switched to ${model.name || model.id}`
				: `No API key for ${model.provider}`,
			success ? "info" : "error",
		);
		return;
	}
}

// Level 1: Uses SelectList for provider selection (has descriptions, needs columns)
async function showSelect(
	ctx: ExtensionContext,
	title: string,
	items: SelectItem[],
): Promise<string | null> {
	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const container = new Container();
			container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
			container.addChild(new Spacer(1));

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const selectList = new (SelectList as any)(
				items,
				Math.min(items.length, 15),
				{
					selectedPrefix: (t: string) => theme.fg("accent", t),
					selectedText: (t: string) => theme.fg("accent", t),
					description: (t: string) => theme.fg("muted", t),
					scrollInfo: (t: string) => theme.fg("dim", t),
					noMatch: (t: string) => theme.fg("warning", t),
				},
				{
					minPrimaryColumnWidth: 20,
					maxPrimaryColumnWidth: 30,
				},
			);

			selectList.onSelect = (item: SelectItem) => done(item.value);
			selectList.onCancel = () => done(null);
			container.addChild(selectList);

			container.addChild(new Spacer(1));
			container.addChild(
				new Text(
					theme.fg("dim", "↑↓ navigate • enter select • esc back"),
					1,
					0,
				),
			);

			return {
				render: (w: number) => container.render(w),
				invalidate: () => container.invalidate(),
				handleInput: (data: string) => selectList.handleInput(data),
			};
		},
		{
			overlay: true,
			overlayOptions: { width: "60%", minWidth: 40, anchor: "center" },
		},
	);
}

// Level 2: Custom model list without column constraints (no truncation)
async function showModelList(
	ctx: ExtensionContext,
	title: string,
	models: ModelInfo[],
): Promise<string | null> {
	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const state = {
				selectedIndex: 0,
				offset: 0,
				lastWidth: 80,
			};
			const maxVisible = 15;

			const container = new Container();

			const render = () => {
				container.clear();
				container.addChild(
					new Text(theme.fg("accent", theme.bold(title)), 1, 0),
				);
				container.addChild(new Spacer(1));

				const startIdx = state.offset;
				const endIdx = Math.min(startIdx + maxVisible, models.length);

				// Content width inside Text (paddingX=1 on each side)
				const contentWidth = Math.max(20, state.lastWidth - 2);
				const prefixWidth = 2; // "→ " or "  "
				const activeIndicator = " ● active";
				const activeIndicatorWidth = visibleWidth(activeIndicator);
				const maxNameWidth = Math.max(
					10,
					contentWidth - prefixWidth - activeIndicatorWidth - 1,
				);

				for (let i = startIdx; i < endIdx; i++) {
					const model = models[i];
					const isSelected = i === state.selectedIndex;
					const displayName = formatModelName(model);
					const isActive = model.id === ctx.model?.id;

					// Truncate name to fit on one line without wrapping
					const truncatedName =
						visibleWidth(displayName) > maxNameWidth
							? `${displayName.slice(0, maxNameWidth - 1)}…`
							: displayName;

					let line: string;
					if (isSelected) {
						const prefix = "→ ";
						const name = theme.fg("accent", truncatedName);
						const active = isActive ? theme.fg("success", activeIndicator) : "";
						line = `${prefix}${name}${active}`;
					} else {
						const prefix = "  ";
						const active = isActive ? theme.fg("success", activeIndicator) : "";
						line = `${prefix}${truncatedName}${active}`;
					}
					container.addChild(new Text(line, 1, 0));
				}

				// Scroll indicator
				if (models.length > maxVisible) {
					container.addChild(new Spacer(1));
					const scrollText = `  ${state.selectedIndex + 1}/${models.length}`;
					container.addChild(new Text(theme.fg("dim", scrollText), 1, 0));
				}

				container.addChild(new Spacer(1));
				container.addChild(
					new Text(
						theme.fg("dim", "↑↓ navigate • enter select • esc back"),
						1,
						0,
					),
				);
			};

			const handleInput = (keyData: string) => {
				if (matchesKey(keyData, "up") || keyData === "k") {
					state.selectedIndex =
						state.selectedIndex === 0
							? models.length - 1
							: state.selectedIndex - 1;
					if (state.selectedIndex < state.offset) {
						state.offset = state.selectedIndex;
					}
					if (state.selectedIndex === models.length - 1) {
						state.offset = Math.max(0, models.length - maxVisible);
					}
					render();
				} else if (matchesKey(keyData, "down") || keyData === "j") {
					state.selectedIndex =
						state.selectedIndex === models.length - 1
							? 0
							: state.selectedIndex + 1;
					if (state.selectedIndex >= state.offset + maxVisible) {
						state.offset = state.selectedIndex - maxVisible + 1;
					}
					if (state.selectedIndex === 0) {
						state.offset = 0;
					}
					render();
				} else if (matchesKey(keyData, "return")) {
					const model = models[state.selectedIndex];
					if (model) {
						done(`${model.provider}/${model.id}`);
					}
				} else if (matchesKey(keyData, "escape")) {
					done(null);
				}
			};

			// Initial render
			render();

			return {
				render: (w: number) => {
					state.lastWidth = w;
					return container.render(w);
				},
				invalidate: () => container.invalidate(),
				handleInput,
			};
		},
		{
			overlay: true,
			overlayOptions: { width: "90%", minWidth: 60, anchor: "center" },
		},
	);
}
