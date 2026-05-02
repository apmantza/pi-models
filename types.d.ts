/**
 * Ambient type declarations for pi runtime modules.
 * These packages are provided at runtime by the pi harness and are not installed locally.
 */

declare module "@mariozechner/pi-tui" {
	export class Box {
		constructor(
			paddingX?: number,
			paddingY?: number,
			bgFn?: (text: string) => string,
		);
		addChild(child: Component | Spacer | Text): void;
		clear(): void;
		render(width: number): string;
		invalidate(): void;
	}

	export class Spacer {
		constructor(height: number);
	}

	export class Text {
		constructor(text: string, x: number, y: number, width?: number);
	}

	export interface SelectItem {
		value: string;
		label?: string;
		description?: string;
	}

	export class SelectList {
		constructor(
			items: SelectItem[],
			maxVisible: number,
			theme?: Record<string, (t: string) => string>,
			layout?: Record<string, number>,
		);
		onSelect: ((item: SelectItem) => void) | null;
		onCancel: (() => void) | null;
		handleInput(data: string): void;
	}

	export function truncateToWidth(
		text: string,
		width: number,
		ellipsis?: string,
	): string;
	export function visibleWidth(text: string): number;
	export function matchesKey(data: string, key: string): boolean;

	export type SizeValue = number | string;
	export type OverlayAnchor =
		| "center"
		| "top"
		| "bottom"
		| "left"
		| "right"
		| "top-left"
		| "top-right"
		| "bottom-left"
		| "bottom-right";
	export type OverlayMargin =
		| number
		| { top?: number; bottom?: number; left?: number; right?: number };

	export interface OverlayOptions {
		width?: SizeValue;
		minWidth?: number;
		maxHeight?: SizeValue;
		anchor?: OverlayAnchor;
		offsetX?: number;
		offsetY?: number;
		row?: SizeValue;
		col?: SizeValue;
		margin?: OverlayMargin | number;
		visible?: (termWidth: number, termHeight: number) => boolean;
		nonCapturing?: boolean;
	}

	export interface OverlayHandle {
		hide(): void;
		setHidden(hidden: boolean): void;
		isHidden(): boolean;
		focus(): void;
	}

	export type Component = {
		render(width: number): string;
		invalidate(): void;
		handleInput?(data: string): void;
		dispose?(): void;
	};

	export type TUI = Record<string, never>;

	export type ThemeColor =
		| "accent"
		| "border"
		| "borderAccent"
		| "borderMuted"
		| "success"
		| "error"
		| "warning"
		| "muted"
		| "dim"
		| "text"
		| "thinkingText"
		| "userMessageText"
		| "customMessageText"
		| "customMessageLabel"
		| "toolTitle"
		| "toolOutput"
		| "mdHeading"
		| "mdLink"
		| "mdLinkUrl"
		| "mdCode"
		| "mdCodeBlock"
		| "mdCodeBlockBorder"
		| "mdQuote"
		| "mdQuoteBorder"
		| "mdHr"
		| "mdListBullet"
		| "toolDiffAdded"
		| "toolDiffRemoved"
		| "toolDiffContext"
		| "syntaxComment"
		| "syntaxKeyword"
		| "syntaxFunction"
		| "syntaxVariable"
		| "syntaxString"
		| "syntaxNumber"
		| "syntaxType"
		| "syntaxOperator"
		| "syntaxPunctuation"
		| "thinkingOff"
		| "thinkingMinimal"
		| "thinkingLow"
		| "thinkingMedium"
		| "thinkingHigh"
		| "thinkingXhigh"
		| "bashMode";

	export type Theme = {
		bold(text: string): string;
		fg(color: ThemeColor, text: string): string;
	};
}

declare module "@mariozechner/pi-coding-agent" {
	import type {
		TUI,
		Theme,
		KeybindingsManager,
		Component,
		OverlayOptions,
		OverlayHandle,
	} from "@mariozechner/pi-tui";

	export interface ModelApi {}

	export interface Model<TApi = ModelApi> {
		id: string;
		name?: string;
		provider: string;
		cost?: { input: number; output: number };
	}

	export class ModelRegistry {
		getAvailable(): Model[];
		find(provider: string, id: string): Model | undefined;
	}

	export interface ExtensionContext {
		modelRegistry: ModelRegistry;
		model?: Model;
		ui: ExtensionUIContext;
	}

	export interface ExtensionCommandContext extends ExtensionContext {
		actions: ExtensionCommandContextActions;
	}

	export interface ExtensionCommandContextActions {
		label: (label: string) => void;
	}

	export interface ExtensionUIContext {
		notify(message: string, type?: "info" | "warning" | "error"): void;
		custom<T>(
			factory: (
				tui: TUI,
				theme: Theme,
				keybindings: KeybindingsManager,
				done: (result: T) => void,
			) =>
				| (Component & { dispose?(): void })
				| Promise<Component & { dispose?(): void }>,
			options?: {
				overlay?: boolean;
				overlayOptions?: OverlayOptions | (() => OverlayOptions);
				onHandle?: (handle: OverlayHandle) => void;
			},
		): Promise<T>;
	}

	export interface ExtensionAPI {
		setModel(model: Model): Promise<boolean>;
		registerCommand(
			name: string,
			config: {
				description: string;
				handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
			},
		): void;
	}
}
