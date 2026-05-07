import { vi } from "vitest";

// Mock @earendil-works/pi-tui (runtime-only, not installed locally)
const mockPiTui = {
	Box: class Box {
		constructor(_paddingX?: number, _paddingY?: number, _bgFn?: (text: string) => string) {}
		addChild() {}
		clear() {}
		render() { return ""; }
		invalidate() {}
	},
	Spacer: class Spacer {
		constructor(_height: number) {}
	},
	Text: class Text {
		constructor(_text: string, _x: number, _y: number, _width?: number) {}
	},
	SelectList: class SelectList {
		constructor() {}
		onSelect: (() => void) | null = null;
		onCancel: (() => void) | null = null;
		handleInput() {}
	},
	truncateToWidth(text: string, width: number, ellipsis?: string): string {
		return text.length > width ? text.slice(0, width) + (ellipsis ?? "…") : text;
	},
	visibleWidth(text: string): number {
		return text.length;
	},
	matchesKey(_data: string, _key: string): boolean {
		return false;
	},
};

vi.mock("@earendil-works/pi-tui", () => mockPiTui);

// Mock @earendil-works/pi-coding-agent (runtime-only, not installed locally)
const mockPiAgent = {
	ModelRegistry: class ModelRegistry {
		getAvailable() { return []; }
		find() { return undefined; }
	},
};

vi.mock("@earendil-works/pi-coding-agent", () => mockPiAgent);
