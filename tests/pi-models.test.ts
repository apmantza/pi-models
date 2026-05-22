import { describe, it, expect } from "vitest";
import {
	isModelFree,
	formatModelName,
	getProviders,
	detectModelFamily,
	getModelFamilies,
	getLabs,
	type ModelInfo,
} from "../pi-models";

// Helper to create a model fixture
function model(
	opts: Partial<ModelInfo> & { id: string; provider: string },
): ModelInfo {
	return {
		id: opts.id,
		name: opts.name ?? opts.id,
		provider: opts.provider,
		isFree: opts.isFree ?? false,
		inputCost: opts.inputCost ?? 0,
		outputCost: opts.outputCost ?? 0,
	};
}

describe("isModelFree", () => {
	it("returns true when both costs are 0 for pricing providers", () => {
		expect(
			isModelFree({
				provider: "openrouter",
				cost: { input: 0, output: 0 },
			}),
		).toBe(true);
	});

	it("returns false when cost is non-zero for pricing providers", () => {
		expect(
			isModelFree({
				provider: "kilo",
				cost: { input: 0.1, output: 0.2 },
			}),
		).toBe(false);
	});

	it("returns true when name includes 'free' for non-pricing providers", () => {
		expect(
			isModelFree({
				provider: "anthropic",
				name: "some-free-model",
			}),
		).toBe(true);
	});

	it("returns false when name does not include 'free' for non-pricing providers", () => {
		expect(
			isModelFree({
				provider: "anthropic",
				name: "claude-sonnet-4",
			}),
		).toBe(false);
	});

	it("handles missing cost gracefully", () => {
		expect(
			isModelFree({
				provider: "openrouter",
			}),
		).toBe(true);
	});
});

describe("formatModelName", () => {
	it("returns name when different from id", () => {
		expect(
			formatModelName(
				model({ id: "gpt-4o", provider: "openai", name: "GPT-4o" }),
			),
		).toBe("GPT-4o");
	});

	it("returns id when name equals id", () => {
		expect(
			formatModelName(model({ id: "claude-sonnet-4", provider: "anthropic" })),
		).toBe("claude-sonnet-4");
	});

	it("returns id when name is undefined", () => {
		expect(
			formatModelName({
				id: "llama3.2",
				name: undefined,
				provider: "ollama",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			}),
		).toBe("llama3.2");
	});
});

describe("getProviders", () => {
	it("groups models by provider", () => {
		const models = [
			model({ id: "gpt-4o", provider: "openai" }),
			model({ id: "claude-sonnet", provider: "anthropic" }),
			model({ id: "gpt-3.5", provider: "openai" }),
		];
		const providers = getProviders(models);

		expect(providers).toHaveLength(2);
		expect(providers[0].models).toHaveLength(1); // anthropic
		expect(providers[1].models).toHaveLength(2); // openai
	});

	it("counts free models correctly", () => {
		const models = [
			model({ id: "free-model", provider: "ollama", isFree: true }),
			model({ id: "paid-model", provider: "ollama" }),
		];
		const providers = getProviders(models);

		expect(providers[0].freeCount).toBe(1);
	});

	it("returns empty array for no models", () => {
		expect(getProviders([])).toEqual([]);
	});

	it("sorts providers alphabetically", () => {
		const models = [
			model({ id: "z-model", provider: "z-provider" }),
			model({ id: "a-model", provider: "a-provider" }),
		];
		const providers = getProviders(models);

		expect(providers[0].id).toBe("a-provider");
		expect(providers[1].id).toBe("z-provider");
	});

	it("sorts models within provider alphabetically", () => {
		const models = [
			model({ id: "z-model", provider: "openai" }),
			model({ id: "a-model", provider: "openai" }),
		];
		const providers = getProviders(models);

		expect(providers[0].models[0].id).toBe("a-model");
		expect(providers[0].models[1].id).toBe("z-model");
	});
});

describe("detectModelFamily", () => {
	it("detects Claude models", () => {
		const result = detectModelFamily(
			model({ id: "claude-sonnet-4", provider: "anthropic" }),
		);
		expect(result?.familyId).toBe("claude");
		expect(result?.lab).toBe("Anthropic");
	});

	it("detects GPT models", () => {
		const result = detectModelFamily(
			model({ id: "gpt-4o", provider: "openai" }),
		);
		expect(result?.familyId).toBe("gpt");
		expect(result?.lab).toBe("OpenAI");
	});

	it("detects Llama models", () => {
		const result = detectModelFamily(
			model({ id: "llama3.2", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("llama");
		expect(result?.lab).toBe("Meta");
	});

	it("detects Gemini models", () => {
		const result = detectModelFamily(
			model({ id: "gemini-1.5-pro", provider: "google" }),
		);
		expect(result?.familyId).toBe("gemini");
		expect(result?.lab).toBe("Google");
	});

	it("detects DeepSeek models", () => {
		const result = detectModelFamily(
			model({ id: "deepseek-r1", provider: "deepseek" }),
		);
		expect(result?.familyId).toBe("deepseek");
		expect(result?.lab).toBe("DeepSeek");
	});

	it("detects Qwen models", () => {
		const result = detectModelFamily(
			model({ id: "qwen3-coder", provider: "qwen" }),
		);
		expect(result?.familyId).toBe("qwen");
		expect(result?.lab).toBe("Alibaba");
	});

	it("detects OpenAI o-series models", () => {
		const result = detectModelFamily(
			model({ id: "o1-preview", provider: "openai" }),
		);
		expect(result?.familyId).toBe("openai-o");
		expect(result?.lab).toBe("OpenAI");
	});

	it("detects router models as Other", () => {
		const result = detectModelFamily(model({ id: "router", provider: "kilo" }));
		expect(result?.familyId).toBe("other");
	});

	it("detects auto models as Other", () => {
		const result = detectModelFamily(
			model({ id: "kilo-auto/free", provider: "kilo" }),
		);
		expect(result?.familyId).toBe("other");
	});

	it("detects Mistral models", () => {
		const result = detectModelFamily(
			model({ id: "mistral-large-3", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("mistral");
		expect(result?.lab).toBe("Mistral");
	});

	it("detects Codestral before Mistral", () => {
		const result = detectModelFamily(
			model({ id: "codestral-22b", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("codestral");
		expect(result?.lab).toBe("Mistral");
	});

	it("detects Arcee/Trinity models", () => {
		const result = detectModelFamily(
			model({ id: "trinity-large-preview", provider: "zen" }),
		);
		expect(result?.familyId).toBe("arcee");
	});

	it("detects Hermes models", () => {
		const result = detectModelFamily(
			model({ id: "hermes-3-llama", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("hermes");
		expect(result?.lab).toBe("Nous Research");
	});

	it("detects CoBuddy models", () => {
		const result = detectModelFamily(
			model({ id: "cobuddy-7b", provider: "baidu" }),
		);
		expect(result?.familyId).toBe("cobuddy");
		expect(result?.lab).toBe("Baidu");
	});

	it("detects Ernie models", () => {
		const result = detectModelFamily(
			model({ id: "ernie-4.0", provider: "baidu" }),
		);
		expect(result?.familyId).toBe("ernie");
		expect(result?.lab).toBe("Baidu");
	});

	it("detects Kimi/Moonshot models", () => {
		const result = detectModelFamily(
			model({ id: "moonshot-v1-32k", provider: "moonshot" }),
		);
		expect(result?.familyId).toBe("kimi");
		expect(result?.lab).toBe("Moonshot");
	});

	it("detects GLM/ChatGLM models", () => {
		const result = detectModelFamily(
			model({ id: "glm-4.7", provider: "zhipu" }),
		);
		expect(result?.familyId).toBe("glm");
		expect(result?.lab).toBe("Zhipu");
	});

	it("detects Nemotron models", () => {
		const result = detectModelFamily(
			model({ id: "nemotron-4-340b", provider: "nvidia" }),
		);
		expect(result?.familyId).toBe("nemotron");
		expect(result?.lab).toBe("NVIDIA");
	});

	it("detects MiniMax models", () => {
		const result = detectModelFamily(
			model({ id: "minimax-m2.5", provider: "minimax" }),
		);
		expect(result?.familyId).toBe("minimax");
		expect(result?.lab).toBe("MiniMax");
	});

	it("detects Grok models", () => {
		const result = detectModelFamily(model({ id: "grok-2", provider: "xai" }));
		expect(result?.familyId).toBe("grok");
		expect(result?.lab).toBe("xAI");
	});

	it("detects Phi models", () => {
		const result = detectModelFamily(
			model({ id: "phi-3-mini", provider: "microsoft" }),
		);
		expect(result?.familyId).toBe("phi");
		expect(result?.lab).toBe("Microsoft");
	});

	it("detects Gemma models", () => {
		const result = detectModelFamily(
			model({ id: "gemma-2-27b", provider: "google" }),
		);
		expect(result?.familyId).toBe("gemma");
		expect(result?.lab).toBe("Google");
	});

	it("detects Doubao models", () => {
		const result = detectModelFamily(
			model({ id: "doubao-pro-32k", provider: "bytedance" }),
		);
		expect(result?.familyId).toBe("doubao");
		expect(result?.lab).toBe("ByteDance");
	});

	it("detects ByteDance models", () => {
		const result = detectModelFamily(
			model({ id: "bytedance-doubao", provider: "bytedance" }),
		);
		expect(result?.familyId).toBe("bytedance");
		expect(result?.lab).toBe("ByteDance");
	});

	it("detects Cohere models", () => {
		const result = detectModelFamily(
			model({ id: "cohere-command", provider: "cohere" }),
		);
		expect(result?.familyId).toBe("cohere");
		expect(result?.lab).toBe("Cohere");
	});

	it("detects Command models", () => {
		const result = detectModelFamily(
			model({ id: "command-r-plus", provider: "cohere" }),
		);
		expect(result?.familyId).toBe("command");
		expect(result?.lab).toBe("Cohere");
	});

	it("detects Lyria models", () => {
		const result = detectModelFamily(
			model({ id: "lyria-v2", provider: "google" }),
		);
		expect(result?.familyId).toBe("lyria");
		expect(result?.lab).toBe("Google");
	});

	it("detects Qianfan models", () => {
		const result = detectModelFamily(
			model({ id: "qianfan-chat", provider: "baidu" }),
		);
		expect(result?.familyId).toBe("qianfan");
		expect(result?.lab).toBe("Baidu");
	});

	it("detects Jamba models", () => {
		const result = detectModelFamily(
			model({ id: "jamba-1.5", provider: "ai21" }),
		);
		expect(result?.familyId).toBe("jamba");
		expect(result?.lab).toBe("AI21");
	});

	it("detects Nova models", () => {
		const result = detectModelFamily(
			model({ id: "nova-lite", provider: "amazon" }),
		);
		expect(result?.familyId).toBe("nova");
		expect(result?.lab).toBe("Amazon");
	});

	it("detects Hy3 models", () => {
		const result = detectModelFamily(
			model({ id: "hy3-70b", provider: "tencent" }),
		);
		expect(result?.familyId).toBe("hy3");
		expect(result?.lab).toBe("Tencent");
	});

	it("detects Inclusion AI models", () => {
		const result = detectModelFamily(
			model({ id: "inclusion-ling", provider: "inclusion" }),
		);
		expect(result?.familyId).toBe("inclusion");
		expect(result?.lab).toBe("Inclusion AI");
	});

	it("detects Laguna models", () => {
		const result = detectModelFamily(
			model({ id: "laguna-7b", provider: "poolside" }),
		);
		expect(result?.familyId).toBe("laguna");
		expect(result?.lab).toBe("Poolside");
	});

	it("detects Llada2 models", () => {
		const result = detectModelFamily(
			model({ id: "llada2-7b", provider: "inclusion" }),
		);
		expect(result?.familyId).toBe("llada2");
		expect(result?.lab).toBe("Inclusion AI");
	});

	it("detects Ring models", () => {
		const result = detectModelFamily(
			model({ id: "ring-v2", provider: "inclusion" }),
		);
		expect(result?.familyId).toBe("ring");
		expect(result?.lab).toBe("Inclusion AI");
	});

	it("detects Tongyi models", () => {
		const result = detectModelFamily(
			model({ id: "tongyi-qwen", provider: "alibaba" }),
		);
		expect(result?.familyId).toBe("tongyi");
		expect(result?.lab).toBe("Alibaba");
	});

	it("detects Mercury models", () => {
		const result = detectModelFamily(
			model({ id: "mercury-1", provider: "inception" }),
		);
		expect(result?.familyId).toBe("mercury");
		expect(result?.lab).toBe("Inception");
	});

	it("detects Mixtral models", () => {
		const result = detectModelFamily(
			model({ id: "mixtral-8x7b", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("mixtral");
		expect(result?.lab).toBe("Mistral");
	});

	it("detects Ministral models", () => {
		const result = detectModelFamily(
			model({ id: "ministral-8b", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("ministral");
		expect(result?.lab).toBe("Mistral");
	});

	it("detects Pixtral models", () => {
		const result = detectModelFamily(
			model({ id: "pixtral-12b", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("pixtral");
		expect(result?.lab).toBe("Mistral");
	});

	it("detects Devstral models", () => {
		const result = detectModelFamily(
			model({ id: "devstral-large", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("devstral");
		expect(result?.lab).toBe("Mistral");
	});

	it("detects Saba models", () => {
		const result = detectModelFamily(
			model({ id: "saba-1", provider: "mistral" }),
		);
		expect(result?.familyId).toBe("saba");
		expect(result?.lab).toBe("Mistral");
	});

	it("strips @cf/ prefix for Cloudflare models", () => {
		const result = detectModelFamily(
			model({ id: "@cf/google/gemma-2-9b", provider: "cloudflare" }),
		);
		expect(result?.familyId).toBe("gemma");
	});

	it("uses provider fallback for minimax", () => {
		const result = detectModelFamily(
			model({ id: "unknown-model", provider: "minimax" }),
		);
		expect(result?.familyId).toBe("minimax");
	});

	it("uses provider fallback for nvidia", () => {
		const result = detectModelFamily(
			model({ id: "unknown-model", provider: "nvidia" }),
		);
		expect(result?.familyId).toBe("nemotron");
	});

	it("handles version-prefixed IDs", () => {
		const result = detectModelFamily(
			model({ id: "4.5-glm-flash", provider: "zhipu" }),
		);
		expect(result?.familyId).toBe("glm");
	});

	it("detects BGE (BAAI) models", () => {
		const result = detectModelFamily(
			model({ id: "bge-large-en-v1.5", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("bge");
		expect(result?.familyName).toBe("BGE");
		expect(result?.lab).toBe("BAAI");
	});

	it("detects BGE base models", () => {
		const result = detectModelFamily(
			model({ id: "bge-base-en-v1.5", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("bge");
		expect(result?.lab).toBe("BAAI");
	});

	it("detects BGE M3 models", () => {
		const result = detectModelFamily(
			model({ id: "bge-m3", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("bge");
		expect(result?.lab).toBe("BAAI");
	});

	it("detects E5 (Intfloat) models", () => {
		const result = detectModelFamily(
			model({ id: "e5-large", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("e5");
		expect(result?.familyName).toBe("E5");
		expect(result?.lab).toBe("Intfloat");
	});

	it("detects E5 base models", () => {
		const result = detectModelFamily(
			model({ id: "e5-base-v2", provider: "ollama" }),
		);
		expect(result?.familyId).toBe("e5");
		expect(result?.lab).toBe("Intfloat");
	});

	it("detects Veo 2 (Google) models", () => {
		const result = detectModelFamily(model({ id: "veo2", provider: "google" }));
		expect(result?.familyId).toBe("veo2");
		expect(result?.familyName).toBe("Veo 2");
		expect(result?.lab).toBe("Google");
	});

	it("detects HY 2.0 (Tencent) models", () => {
		const result = detectModelFamily(
			model({ id: "hy2-7b", provider: "tencent" }),
		);
		expect(result?.familyId).toBe("hy2");
		expect(result?.familyName).toBe("HY 2.0");
		expect(result?.lab).toBe("Tencent");
	});

	it("detects LFM 2 (Liquid) models", () => {
		const result = detectModelFamily(
			model({ id: "lfm2-7b", provider: "liquid" }),
		);
		expect(result?.familyId).toBe("lfm2");
		expect(result?.familyName).toBe("LFM 2");
		expect(result?.lab).toBe("Liquid");
	});

	it("falls back gracefully for unknown models", () => {
		const result = detectModelFamily(
			model({ id: "unknown-model-123", provider: "unknown-provider" }),
		);
		expect(result).not.toBeNull();
	});

	it("detects multi-provider model names", () => {
		const result = detectModelFamily(
			model({
				id: "trinity-large-preview",
				provider: "cline",
				name: "Trinity Large Preview",
			}),
		);
		expect(result?.familyId).toBe("arcee");
	});
});

describe("getModelFamilies", () => {
	it("groups models by family", () => {
		const models = [
			model({ id: "claude-sonnet-4", provider: "anthropic" }),
			model({ id: "claude-haiku-3", provider: "anthropic" }),
			model({ id: "gpt-4o", provider: "openai" }),
		];
		const families = getModelFamilies(models);

		expect(families).toHaveLength(2);
		const claude = families.find((f) => f.id === "claude");
		expect(claude?.models).toHaveLength(2);
	});

	it("merges families with same normalized name", () => {
		const models = [
			model({
				id: "trinity-large-preview",
				provider: "zen",
				name: "Trinity Large Preview",
			}),
			model({
				id: "arcee-trinity-large",
				provider: "cline",
				name: "Trinity Large Preview (cline)",
			}),
		];
		const families = getModelFamilies(models);

		const arcee = families.find((f) => f.id === "arcee");
		expect(arcee?.models).toHaveLength(2);
	});

	it("sorts families alphabetically", () => {
		const models = [
			model({ id: "gpt-4o", provider: "openai" }),
			model({ id: "claude-sonnet-4", provider: "anthropic" }),
		];
		const families = getModelFamilies(models);

		expect(families[0].displayName < families[1].displayName).toBe(true);
	});

	it("returns empty array for no models", () => {
		expect(getModelFamilies([])).toEqual([]);
	});

	it("sets lab correctly", () => {
		const models = [model({ id: "claude-sonnet-4", provider: "anthropic" })];
		const families = getModelFamilies(models);

		expect(families[0].lab).toBe("Anthropic");
	});
});

describe("getLabs", () => {
	it("groups models by lab", () => {
		const models = [
			model({ id: "gpt-4o", provider: "openai" }),
			model({ id: "claude-sonnet-4", provider: "anthropic" }),
		];
		const labs = getLabs(models);

		expect(labs).toHaveLength(2);
	});

	it("tracks family IDs per lab", () => {
		const models = [
			model({ id: "gpt-4o", provider: "openai" }),
			model({ id: "o1-preview", provider: "openai" }),
		];
		const labs = getLabs(models);

		const openai = labs.find((l) => l.id === "openai");
		expect(openai?.families).toContain("gpt");
		expect(openai?.families).toContain("openai-o");
	});

	it("sorts labs alphabetically", () => {
		const models = [
			model({ id: "llama3.2", provider: "ollama" }),
			model({ id: "claude-sonnet-4", provider: "anthropic" }),
		];
		const labs = getLabs(models);

		expect(labs[0].name < labs[1].name).toBe(true);
	});

	it("handles unknown lab", () => {
		const models = [
			model({ id: "unknown-model", provider: "unknown-provider" }),
		];
		const labs = getLabs(models);

		expect(labs.length).toBeGreaterThan(0);
	});

	it("returns empty array for no models", () => {
		expect(getLabs([])).toEqual([]);
	});
});
