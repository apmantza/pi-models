/**
 * Pi Models Extension
 *
 * Three-level menu:
 *   1. Browse mode: Choose "By Provider" or "By Model Family"
 *   2. Category: Provider list OR Model family list
 *   3. Selection: Model list (with provider submenu for multi-provider families)
 *
 * "Free Models" is always listed first as a virtual option in both views.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
	Box,
	matchesKey,
	type SelectItem,
	SelectList,
	Spacer,
	Text,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";

export interface ModelInfo {
	id: string;
	name?: string;
	provider: string;
	isFree: boolean;
	inputCost: number;
	outputCost: number;
}

// Providers that expose actual per-model pricing via API
const PRICING_EXPOSED_PROVIDERS = new Set([
	"openrouter",
	"opencode",
	"kilo",
	"cline",
]);

/**
 * Check if a model is free.
 *
 * For providers with pricing APIs: uses cost (input === 0 && output === 0)
 * For providers without pricing: ONLY uses name-based check (name includes "free")
 */
export function isModelFree(model: {
	cost?: { input: number; output: number };
	name?: string;
	provider?: string;
}): boolean {
	const hasPricing =
		model.provider && PRICING_EXPOSED_PROVIDERS.has(model.provider);

	// For providers WITH pricing API: cost-based check
	if (hasPricing) {
		if ((model.cost?.input ?? 0) === 0 && (model.cost?.output ?? 0) === 0) {
			return true;
		}
	}

	// For providers WITHOUT pricing API: ONLY name-based check
	if (model.name?.toLowerCase().includes("free")) {
		return true;
	}

	return false;
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

export function formatModelName(model: ModelInfo): string {
	return model.name && model.name !== model.id ? model.name : model.id;
}

export interface Provider {
	id: string;
	name: string;
	models: ModelInfo[];
	freeCount: number;
}

export function getProviders(models: ModelInfo[]): Provider[] {
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

export interface ModelFamily {
	id: string; // Normalized family ID (e.g., "claude-sonnet")
	displayName: string; // Human readable (e.g., "Claude Sonnet")
	lab: string; // The lab/company that created this family
	models: ModelInfo[]; // All models in this family
}

export interface Lab {
	id: string; // Lab ID (e.g., "openai")
	name: string; // Human readable (e.g., "OpenAI")
	models: ModelInfo[];
	families: string[]; // Family IDs this lab has models in
}

export function detectModelFamily(
	model: ModelInfo,
): { familyId: string; familyName: string; lab: string } | null {
	let id = model.id.toLowerCase();
	const name = (model.name || "").toLowerCase();

	// Strip Cloudflare @cf/ prefix to get the actual model family
	// e.g., "@cf/google/gemma" -> "google/gemma" for family detection
	if (id.startsWith("@cf/")) {
		id = id.slice(4); // Remove "@cf/" prefix
	}

	const fullText = `${id} ${name}`;

	// Router models (gateways to free models) - group into "Other"
	// Match "router" or "auto" as whole words, or specific known router IDs
	if (
		/\brouter\b/.test(fullText) ||
		/\bauto\b/.test(fullText) ||
		id === "kilo-auto/free"
	) {
		return { familyId: "other", familyName: "Other", lab: "Other" };
	}

	// Known brand keywords to check in ID and name
	// Order matters: more specific/longer matches should come before shorter ones
	const brandMappings: {
		keywords: string[];
		familyId: string;
		familyName: string;
		lab: string;
	}[] = [
		{
			keywords: ["bytedance"],
			familyId: "bytedance",
			familyName: "ByteDance",
			lab: "ByteDance",
		},
		{
			keywords: ["claude"],
			familyId: "claude",
			familyName: "Claude",
			lab: "Anthropic",
		},
		{
			keywords: ["cohere"],
			familyId: "cohere",
			familyName: "Cohere",
			lab: "Cohere",
		},
		{
			keywords: ["command"],
			familyId: "command",
			familyName: "Command",
			lab: "Cohere",
		},
		{
			keywords: ["deepseek"],
			familyId: "deepseek",
			familyName: "DeepSeek",
			lab: "DeepSeek",
		},
		{
			keywords: ["doubao"],
			familyId: "doubao",
			familyName: "Doubao",
			lab: "ByteDance",
		},
		{
			keywords: ["gemma"],
			familyId: "gemma",
			familyName: "Gemma",
			lab: "Google",
		},
		{
			keywords: ["gemini"],
			familyId: "gemini",
			familyName: "Gemini",
			lab: "Google",
		},
		{
			keywords: ["lyria"],
			familyId: "lyria",
			familyName: "Lyria",
			lab: "Google",
		},
		{ keywords: ["gpt"], familyId: "gpt", familyName: "GPT", lab: "OpenAI" },
		{ keywords: ["grok"], familyId: "grok", familyName: "Grok", lab: "xAI" },
		{
			keywords: ["hy3"],
			familyId: "hy3",
			familyName: "Hy3",
			lab: "Tencent",
		},
		{
			keywords: ["llama"],
			familyId: "llama",
			familyName: "Llama",
			lab: "Meta",
		},
		{ keywords: ["mimo"], familyId: "mimo", familyName: "Mimo", lab: "Xiaomi" },
		{
			keywords: ["minimax"],
			familyId: "minimax",
			familyName: "MiniMax",
			lab: "MiniMax",
		},
		{
			keywords: ["qianfan"],
			familyId: "qianfan",
			familyName: "Qianfan",
			lab: "Baidu",
		},
		{
			keywords: ["qwen"],
			familyId: "qwen",
			familyName: "Qwen",
			lab: "Alibaba",
		},
		{
			keywords: ["nemotron"],
			familyId: "nemotron",
			familyName: "Nemotron",
			lab: "NVIDIA",
		},
		{ keywords: ["nova"], familyId: "nova", familyName: "Nova", lab: "Amazon" },
		{
			keywords: ["kimi", "moonshot"],
			familyId: "kimi",
			familyName: "Kimi",
			lab: "Moonshot",
		},
		{
			keywords: ["glm", "chatglm"],
			familyId: "glm",
			familyName: "GLM",
			lab: "Zhipu",
		},
		{
			keywords: ["codestral"],
			familyId: "codestral",
			familyName: "Codestral",
			lab: "Mistral",
		},
		{
			keywords: ["devstral"],
			familyId: "devstral",
			familyName: "Devstral",
			lab: "Mistral",
		},
		{
			keywords: ["ministral"],
			familyId: "ministral",
			familyName: "Ministral",
			lab: "Mistral",
		},
		{
			keywords: ["mixtral"],
			familyId: "mixtral",
			familyName: "Mixtral",
			lab: "Mistral",
		},
		{
			keywords: ["pixtral"],
			familyId: "pixtral",
			familyName: "Pixtral",
			lab: "Mistral",
		},
		{
			keywords: ["saba"],
			familyId: "saba",
			familyName: "Saba",
			lab: "Mistral",
		},
		{
			keywords: ["mistral"],
			familyId: "mistral",
			familyName: "Mistral",
			lab: "Mistral",
		},
		{
			keywords: ["arcee", "trinity"],
			familyId: "arcee",
			familyName: "Arcee",
			lab: "Arcee",
		},
		{
			keywords: ["hermes"],
			familyId: "hermes",
			familyName: "Hermes",
			lab: "Nous Research",
		},
		{
			keywords: ["ernie"],
			familyId: "ernie",
			familyName: "Ernie",
			lab: "Baidu",
		},
		{
			keywords: ["jamba"],
			familyId: "jamba",
			familyName: "Jamba",
			lab: "AI21",
		},
		{
			keywords: ["laguna"],
			familyId: "laguna",
			familyName: "Laguna",
			lab: "Poolside",
		},
		{ keywords: ["kat"], familyId: "kat", familyName: "KAT", lab: "KAT" },
		{
			keywords: ["inclusion"],
			familyId: "inclusion",
			familyName: "Inclusion AI",
			lab: "Inclusion AI",
		},
		{
			keywords: ["ling"],
			familyId: "ling",
			familyName: "Ling",
			lab: "Inclusion AI",
		},
		{
			keywords: ["llada"],
			familyId: "llada2",
			familyName: "Llada2",
			lab: "Inclusion AI",
		},
		{
			keywords: ["ring"],
			familyId: "ring",
			familyName: "Ring",
			lab: "Inclusion AI",
		},
		{
			keywords: ["mercury"],
			familyId: "mercury",
			familyName: "Mercury",
			lab: "Inception",
		},
		{ keywords: ["phi"], familyId: "phi", familyName: "Phi", lab: "Microsoft" },
		{
			keywords: ["poolside"],
			familyId: "poolside",
			familyName: "Poolside",
			lab: "Poolside",
		},
		{ keywords: ["rnj"], familyId: "rnj", familyName: "RNJ", lab: "RNJ" },
		{ keywords: ["step"], familyId: "step", familyName: "Step", lab: "Step" },
		{
			keywords: ["tongyi"],
			familyId: "tongyi",
			familyName: "Tongyi",
			lab: "Alibaba",
		},
		{
			keywords: ["o1", "o3", "o4"],
			familyId: "openai-o",
			familyName: "OpenAI o",
			lab: "OpenAI",
		},
		{
			keywords: ["@cf", "cloudflare"],
			familyId: "cloudflare",
			familyName: "Cloudflare",
			lab: "Cloudflare",
		},
	];

	// Check for known brands in ID or name
	for (const mapping of brandMappings) {
		for (const keyword of mapping.keywords) {
			if (fullText.includes(keyword)) {
				return {
					familyId: mapping.familyId,
					familyName: mapping.familyName,
					lab: mapping.lab,
				};
			}
		}
	}

	// Provider-specific fallbacks for models without brand in ID/name
	const providerMappings: Record<
		string,
		{ familyId: string; familyName: string; lab: string }
	> = {
		minimax: { familyId: "minimax", familyName: "MiniMax", lab: "MiniMax" },
		minimaxai: { familyId: "minimax", familyName: "MiniMax", lab: "MiniMax" },
		deepseek: { familyId: "deepseek", familyName: "DeepSeek", lab: "DeepSeek" },
		nvidia: { familyId: "nemotron", familyName: "Nemotron", lab: "NVIDIA" },
		moonshot: { familyId: "kimi", familyName: "Kimi", lab: "Moonshot" },
		zhipu: { familyId: "glm", familyName: "GLM", lab: "Zhipu" },
	};

	if (providerMappings[model.provider]) {
		return providerMappings[model.provider];
	}

	// Helper function to check if any part matches a brand keyword
	function findBrandInParts(
		parts: string[],
	): { familyId: string; familyName: string; lab: string } | null {
		for (const part of parts) {
			for (const mapping of brandMappings) {
				for (const keyword of mapping.keywords) {
					if (part.includes(keyword)) {
						return {
							familyId: mapping.familyId,
							familyName: mapping.familyName,
							lab: mapping.lab,
						};
					}
				}
			}
		}
		return null;
	}

	// Smart fallback: try to identify the brand from the model ID structure
	// Common patterns: "brand-model-version" or "brand-model"
	const parts = id.split(/[-_:.]/);

	// If ID starts with a version number (like "4.5" or "v3"), check remaining parts for brand
	const firstPart = parts[0];
	if (firstPart && /^v?\d+(\.\d+)?$/.test(firstPart)) {
		// ID starts with version number - check if name contains a known brand
		for (const mapping of brandMappings) {
			for (const keyword of mapping.keywords) {
				if (name.includes(keyword)) {
					return {
						familyId: mapping.familyId,
						familyName: mapping.familyName,
						lab: mapping.lab,
					};
				}
			}
		}

		// Check ALL remaining parts for brand keywords (not just second part)
		// e.g., "4.5-glm-flash", "v3.5-ai21-jamba", "2024-08-claude"
		const brandFromParts = findBrandInParts(parts.slice(1));
		if (brandFromParts) {
			return brandFromParts;
		}
	}

	// If ID has multiple parts, check ALL parts for brand keywords
	// e.g., "kilo-qwen", "openrouter-claude", "fireworks-llama"
	if (parts.length > 1) {
		const brandFromParts = findBrandInParts(parts);
		if (brandFromParts) {
			return brandFromParts;
		}

		// Use first part as brand if it looks brand-like (not just a version number)
		if (firstPart && !/^v?\d+(\.\d+)?$/.test(firstPart)) {
			return {
				familyId: firstPart,
				familyName: firstPart.charAt(0).toUpperCase() + firstPart.slice(1),
				lab: firstPart.charAt(0).toUpperCase() + firstPart.slice(1),
			};
		}
	}

	// Last resort: use first non-version part, or full ID
	// If first part is a version number and we have more parts, try to find a brand-like part
	if (firstPart && /^v?\d+(\.\d+)?$/.test(firstPart) && parts.length > 1) {
		// Look for a non-numeric part to use as family name
		for (let i = 1; i < parts.length; i++) {
			const part = parts[i];
			// Use first non-numeric, non-empty part that's not a common suffix
			if (
				part &&
				!/^v?\d+(\.\d+)?$/.test(part) &&
				!["latest", "preview", "rc", "beta", "alpha", "dev"].includes(part)
			) {
				return {
					familyId: part,
					familyName: part.charAt(0).toUpperCase() + part.slice(1),
					lab: part.charAt(0).toUpperCase() + part.slice(1),
				};
			}
		}
	}

	return {
		familyId: firstPart || id,
		familyName:
			(firstPart || id).charAt(0).toUpperCase() + (firstPart || id).slice(1),
		lab: (firstPart || id).charAt(0).toUpperCase() + (firstPart || id).slice(1),
	};
}

/**
 * Normalize a model name for comparison by removing provider-specific suffixes
 * and common qualifiers. This helps detect when the same model is offered by
 * multiple providers with slightly different naming.
 */
function normalizeModelName(name: string): string {
	return (
		name
			.toLowerCase()
			// Remove common suffixes added by providers
			.replace(/\s*\(free\)\s*$/i, "")
			.replace(/\s*\(cline\)\s*$/i, "")
			.replace(/\s*\(ci:\s*[\d.]+\)\s*$/i, "") // CI scores like [CI: 29.2]
			.replace(/\s*\[ci:\s*[\d.]+\]\s*$/i, "")
			.replace(/\([^)]*\)\s*$/g, "") // Remove any trailing parenthetical (leading space cleaned by .trim() below)
			.trim()
	);
}

export function getModelFamilies(models: ModelInfo[]): ModelFamily[] {
	const byFamily = new Map<string, ModelInfo[]>();
	const nameToFamilyId = new Map<string, string>();

	for (const model of models) {
		const family = detectModelFamily(model);
		if (!family) continue;

		const existing = byFamily.get(family.familyId) ?? [];
		existing.push(model);
		byFamily.set(family.familyId, existing);
	}

	// Second pass: merge families with models that have the same normalized name
	// This catches cases where the same model from different providers gets
	// different family IDs (e.g., "Trinity Large Preview" from zen vs arcee)
	const familyIds = [...byFamily.keys()];
	for (const familyId of familyIds) {
		const familyModels = byFamily.get(familyId);
		if (!familyModels) continue;

		for (const model of familyModels) {
			const normalizedName = normalizeModelName(model.name || model.id);
			if (!normalizedName) continue;

			const existingFamilyForName = nameToFamilyId.get(normalizedName);
			if (existingFamilyForName && existingFamilyForName !== familyId) {
				// Same model name found in different family - merge them
				const targetFamily = byFamily.get(existingFamilyForName);
				const sourceFamily = byFamily.get(familyId);
				if (targetFamily && sourceFamily) {
					// Move all models from source to target
					targetFamily.push(...sourceFamily);
					byFamily.delete(familyId);
					break; // This family is gone, move to next
				}
			} else {
				nameToFamilyId.set(normalizedName, familyId);
			}
		}
	}

	const families: ModelFamily[] = [];
	for (const [id, models] of byFamily) {
		// Get display name from first model's detection
		const firstModel = models[0]!;
		const familyInfo = detectModelFamily(firstModel)!;

		families.push({
			id,
			displayName: familyInfo.familyName,
			lab: familyInfo.lab,
			models: models.sort(
				(a, b) =>
					a.provider.localeCompare(b.provider) || b.id.localeCompare(a.id),
			), // Sort by provider, then newest first
		});
	}

	return families.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getLabs(models: ModelInfo[]): Lab[] {
	const byLab = new Map<
		string,
		{ models: ModelInfo[]; families: Set<string> }
	>();

	for (const model of models) {
		const familyInfo = detectModelFamily(model);
		const lab = familyInfo?.lab || "Unknown";
		const labId = lab.toLowerCase().replace(/\s+/g, "-");

		const existing = byLab.get(labId) ?? { models: [], families: new Set() };
		existing.models.push(model);
		if (familyInfo) {
			existing.families.add(familyInfo.familyId);
		}
		byLab.set(labId, existing);
	}

	const labs: Lab[] = [];
	for (const [id, data] of byLab) {
		labs.push({
			id,
			name: data.models[0] ? detectModelFamily(data.models[0])?.lab || id : id,
			models: data.models.sort((a, b) => a.id.localeCompare(b.id)),
			families: [...data.families],
		});
	}
	return labs.sort((a, b) => a.name.localeCompare(b.name));
}

async function applyModelSelection(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	modelRef: string, // "provider/modelId" format
): Promise<void> {
	const slashIndex = modelRef.indexOf("/");
	if (slashIndex === -1) return;

	const model = ctx.modelRegistry.find(
		modelRef.slice(0, slashIndex),
		modelRef.slice(slashIndex + 1),
	);

	if (!model) {
		ctx.ui.notify(`Model not found`, "error");
		return;
	}

	const success = await pi.setModel(model);
	ctx.ui.notify(
		success
			? `Switched to ${model.name || model.id}`
			: `No API key for ${model.provider}`,
		success ? "info" : "error",
	);
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
	// LEVEL 0: Choose browse mode
	const browseModes: SelectItem[] = [
		{
			value: "provider",
			label: "📦 By Provider",
			description: "Browse by provider (OpenAI, Anthropic, etc.)",
		},
		{
			value: "lab",
			label: "🔬 By Lab",
			description: "Browse by lab/company (Meta, OpenAI, etc.)",
		},
		{
			value: "family",
			label: "🏷️ By Model Family",
			description: "Browse by model type (GPT-4, Claude, etc.)",
		},
	];

	const browseMode = await showSelect(ctx, "📦 Browse Models", browseModes);
	if (!browseMode) return;

	if (browseMode === "provider") {
		await showProviderView(pi, ctx);
	} else if (browseMode === "lab") {
		await showLabView(pi, ctx);
	} else {
		await showFamilyView(pi, ctx);
	}
}

async function showFamilyView(pi: ExtensionAPI, ctx: ExtensionContext) {
	while (true) {
		const allModels = getAvailableModels(ctx);
		const families = getModelFamilies(allModels);

		// Build family items with provider info in description
		const familyItems: SelectItem[] = families.map((f) => {
			const providers = [...new Set(f.models.map((m) => m.provider))];
			const providerDesc =
				providers.length > 1
					? `Available from ${providers.length} providers (${f.models.length} versions)`
					: `From ${providers[0]} (${f.models.length} versions)`;

			return {
				value: f.id,
				label: f.displayName,
				description: providerDesc,
			};
		});

		// Add Free Models as special family
		const freeModels = allModels.filter((m) => m.isFree);
		if (freeModels.length > 0) {
			familyItems.unshift({
				value: "__free",
				label: "🆓 Free Models",
				description: `${freeModels.length} free models across providers`,
			});
		}

		const selectedFamilyId = await showSelect(
			ctx,
			"🏷️ Model Families",
			familyItems,
			() => "__toggle", // Return toggle sentinel on Tab
		);
		if (!selectedFamilyId) {
			await showModelsBrowser(pi, ctx);
			return;
		}

		// Handle toggle to provider view
		if (selectedFamilyId === "__toggle") {
			await showProviderView(pi, ctx);
			return;
		}

		// Handle free models
		if (selectedFamilyId === "__free") {
			const selectedModelId = await showModelList(
				ctx,
				"🆓 Free Models",
				freeModels,
			);
			if (!selectedModelId) continue; // Esc - back to family list
			await applyModelSelection(pi, ctx, selectedModelId);
			return;
		}

		// Find selected family
		const family = families.find((f) => f.id === selectedFamilyId);
		if (!family) continue;

		// Show all models from all providers for this family
		const selectedModelId = await showModelList(
			ctx,
			`🏷️ ${family.displayName}`,
			family.models,
		);
		if (!selectedModelId) continue; // Esc - back to family list
		await applyModelSelection(pi, ctx, selectedModelId);
		return;
	}
}

async function showLabView(pi: ExtensionAPI, ctx: ExtensionContext) {
	while (true) {
		const allModels = getAvailableModels(ctx);
		const labs = getLabs(allModels);
		const freeModels = allModels.filter((m) => m.isFree);

		// Level 1: Lab selection
		const labItems: SelectItem[] = [
			{
				value: "__free",
				label: "🆓 Free Models",
				description: `${freeModels.length} models`,
			},
		];
		for (const lab of labs) {
			const familyCount = lab.families.length;
			const desc =
				familyCount > 1
					? `${lab.models.length} models (${familyCount} families)`
					: `${lab.models.length} models`;
			labItems.push({ value: lab.id, label: lab.name, description: desc });
		}

		const selectedLabId = await showSelect(
			ctx,
			"🔬 Labs",
			labItems,
			() => "__toggle", // Return toggle sentinel on Tab
		);
		if (!selectedLabId) {
			await showModelsBrowser(pi, ctx);
			return;
		}

		// Handle toggle to provider view
		if (selectedLabId === "__toggle") {
			await showProviderView(pi, ctx);
			return;
		}

		// Handle free models
		if (selectedLabId === "__free") {
			const selectedModelId = await showModelList(
				ctx,
				"🆓 Free Models",
				freeModels,
			);
			if (!selectedModelId) continue; // Esc - back to lab list
			await applyModelSelection(pi, ctx, selectedModelId);
			return;
		}

		// Find selected lab
		const lab = labs.find((l) => l.id === selectedLabId);
		if (!lab) continue;

		// Show all models from this lab directly (no family grouping)
		const selectedModelId = await showModelList(
			ctx,
			`🔬 ${lab.name}`,
			lab.models,
		);
		if (!selectedModelId) continue; // Esc - back to lab list
		await applyModelSelection(pi, ctx, selectedModelId);
		return;
	}
}

async function showProviderView(pi: ExtensionAPI, ctx: ExtensionContext) {
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

		const selectedProvider = await showSelect(
			ctx,
			"📦 Models",
			providerItems,
			() => "__toggle", // Return toggle sentinel on Tab
		);
		if (!selectedProvider) {
			await showModelsBrowser(pi, ctx);
			return;
		}

		// Handle toggle to family view
		if (selectedProvider === "__toggle") {
			await showFamilyView(pi, ctx);
			return;
		}

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

		// Level 2: Model selection
		const selectedModelId = await showModelList(ctx, sectionTitle, modelItems);
		if (!selectedModelId) continue; // Esc pressed - go back to level 1

		await applyModelSelection(pi, ctx, selectedModelId);
		return;
	}
}

// Helper to add Greek flag blue background color to text (RGB: 0, 20, 137)
const bgColor = (text: string): string => `\x1b[48;2;0;20;137m${text}\x1b[0m`;

// Helper to calculate optimal width for SelectList content
function calculateSelectWidth(
	items: SelectItem[],
	title: string,
	onToggle: boolean,
): number {
	const prefixWidth = 2; // "→ " or "  "
	const primaryGap = 2; // PRIMARY_COLUMN_GAP
	const boxPadding = 2; // Box paddingX=1 on each side
	const safetyMargin = 2; // Extra breathing room

	// Calculate max label width
	const maxLabelWidth = Math.max(
		...items.map((item) => visibleWidth(item.label ?? "")),
		visibleWidth(title),
	);

	// Calculate max description width (if any items have descriptions)
	const itemsWithDesc = items.filter((i) => i.description);
	const maxDescWidth =
		itemsWithDesc.length > 0
			? Math.max(...itemsWithDesc.map((i) => visibleWidth(i.description || "")))
			: 0;

	// Calculate help text width
	const helpText = onToggle
		? "↑↓ navigate • enter select • esc back • tab toggle view"
		: "↑↓ navigate • enter select • esc back";
	const helpWidth = visibleWidth(helpText);

	// If we have descriptions, use two-column layout width
	let contentWidth: number;
	if (maxDescWidth > 0) {
		// Two-column: prefix + primary column + gap + description
		contentWidth =
			prefixWidth + Math.max(maxLabelWidth + primaryGap, 20) + maxDescWidth;
	} else {
		// Single column: prefix + label
		contentWidth = prefixWidth + maxLabelWidth;
	}

	// Total width includes box padding and safety margin
	const totalWidth = Math.max(
		contentWidth + boxPadding + safetyMargin,
		helpWidth + boxPadding,
		40, // minimum reasonable width
	);

	// Cap at 120 columns max
	return Math.min(totalWidth, 120);
}

// Level 1: Uses SelectList for provider selection (has descriptions, needs columns)
async function showSelect(
	ctx: ExtensionContext,
	title: string,
	items: SelectItem[],
	onToggle?: () => string | null,
): Promise<string | null> {
	// Calculate optimal width based on content
	const optimalWidth = calculateSelectWidth(items, title, !!onToggle);

	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const box = new Box(1, 1, bgColor);
			box.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
			box.addChild(new Spacer(1));

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
					// No maxPrimaryColumnWidth - allow auto-sizing to content
				},
			);

			selectList.onSelect = (item: SelectItem) => done(item.value);
			selectList.onCancel = () => done(null);
			box.addChild(selectList);

			box.addChild(new Spacer(1));
			const helpText = onToggle
				? "↑↓ navigate • enter select • esc back • tab toggle view"
				: "↑↓ navigate • enter select • esc back";
			box.addChild(new Text(theme.fg("dim", helpText), 1, 0));

			return {
				render: (w: number) => box.render(w),
				invalidate: () => box.invalidate(),
				handleInput: (data: string) => {
					// Handle Tab for toggle if callback provided
					if (onToggle && matchesKey(data, "tab")) {
						done(onToggle());
						return;
					}
					selectList.handleInput(data);
				},
			};
		},
		{
			overlay: true,
			overlayOptions: { width: optimalWidth, anchor: "center" },
		},
	);
}

// Helper to calculate optimal width for model list content
function calculateModelListWidth(
	models: ModelInfo[],
	title: string,
	activeModelId: string | undefined,
): number {
	const prefixWidth = 2; // "→ " or "  "
	const activeIndicator = " ● active";
	const activeIndicatorWidth = visibleWidth(activeIndicator);
	const boxPadding = 2; // Box paddingX=1 on each side
	const safetyMargin = 2; // Extra breathing room
	const codingIndexWidth = 8; // Buffer for " (XX.X)" score appended by other extensions

	// Check if we have multiple providers
	const providers = [...new Set(models.map((m) => m.provider))];
	const showProviders = providers.length > 1;

	// Calculate max display name width
	const maxNameWidth = Math.max(
		...models.map((model) => {
			let displayName = formatModelName(model);
			if (showProviders) {
				const providerLower = model.provider.toLowerCase();
				const nameLower = displayName.toLowerCase();
				if (
					nameLower.startsWith(`${providerLower} `) ||
					nameLower.startsWith(`${providerLower}-`)
				) {
					displayName = displayName.slice(model.provider.length + 1).trim();
				}
				displayName = `[${model.provider}] ${displayName}`;
			}
			return visibleWidth(displayName);
		}),
		visibleWidth(title),
	);

	// Check if any model is active (needs extra space for indicator)
	const hasActive = models.some((m) => m.id === activeModelId);

	// Total width: prefix + name + coding index score + optional active indicator + box padding + safety
	const contentWidth =
		prefixWidth +
		maxNameWidth +
		codingIndexWidth +
		(hasActive ? activeIndicatorWidth : 0);

	// Scroll indicator width (e.g., "  15/30")
	const scrollWidth =
		models.length > 15
			? visibleWidth(`  ${models.length}/${models.length}`)
			: 0;

	const totalWidth = Math.max(
		contentWidth + boxPadding + safetyMargin,
		scrollWidth + boxPadding,
		visibleWidth("↑↓ navigate • enter select • esc back") + boxPadding,
		40, // minimum reasonable width
	);

	// Cap at 120 columns max
	return Math.min(totalWidth, 120);
}

// Level 2: Custom model list without column constraints (no truncation)
async function showModelList(
	ctx: ExtensionContext,
	title: string,
	models: ModelInfo[],
): Promise<string | null> {
	// Calculate optimal width based on content
	const optimalWidth = calculateModelListWidth(models, title, ctx.model?.id);

	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const state = {
				selectedIndex: 0,
				offset: 0,
				lastWidth: 80,
			};
			const maxVisible = 15;

			const box = new Box(1, 1, bgColor);

			const render = () => {
				box.clear();
				box.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
				box.addChild(new Spacer(1));

				const startIdx = state.offset;
				const endIdx = Math.min(startIdx + maxVisible, models.length);

				// Content width inside Text (paddingX=1 on each side)
				const contentWidth = Math.max(20, state.lastWidth - 2);
				const prefixWidth = 2; // "→ " or "  "
				const activeIndicator = " ● active";
				const activeIndicatorWidth = visibleWidth(activeIndicator);

				// Check if we have multiple providers
				const providers = [...new Set(models.map((m) => m.provider))];
				const showProviders = providers.length > 1;

				for (let i = startIdx; i < endIdx; i++) {
					const model = models[i];
					const isSelected = i === state.selectedIndex;
					let displayName = formatModelName(model);
					// Add provider prefix, stripping it from model name if already present to avoid duplication
					if (showProviders) {
						const providerLower = model.provider.toLowerCase();
						const nameLower = displayName.toLowerCase();
						if (
							nameLower.startsWith(`${providerLower} `) ||
							nameLower.startsWith(`${providerLower}-`)
						) {
							// Strip provider prefix from name to avoid duplication
							displayName = displayName.slice(model.provider.length + 1).trim();
						}
						displayName = `[${model.provider}] ${displayName}`;
					}
					const isActive = model.id === ctx.model?.id;

					// Use truncateToWidth for proper ANSI-safe truncation only if needed
					const maxNameWidth =
						contentWidth - prefixWidth - activeIndicatorWidth - 1;
					const truncatedName = truncateToWidth(displayName, maxNameWidth, "…");

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
					box.addChild(new Text(line, 1, 0));
				}

				// Scroll indicator
				if (models.length > maxVisible) {
					box.addChild(new Spacer(1));
					const scrollText = `  ${state.selectedIndex + 1}/${models.length}`;
					box.addChild(new Text(theme.fg("dim", scrollText), 1, 0));
				}

				box.addChild(new Spacer(1));
				box.addChild(
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
					return box.render(w);
				},
				invalidate: () => box.invalidate(),
				handleInput,
			};
		},
		{
			overlay: true,
			overlayOptions: { width: optimalWidth, anchor: "center" },
		},
	);
}
