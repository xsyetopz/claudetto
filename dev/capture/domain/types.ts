export interface Block {
	type?: string;
	text?: unknown;
	content?: unknown;
	name?: unknown;
}

export interface Message {
	role: string;
	content: string | Block[];
}

export interface Tool {
	type?: string;
	name?: string;
	defer_loading?: boolean;
}

export interface Body {
	model?: string;
	system?: string | Block[];
	tools?: Tool[];
	messages: Message[];
	thinking?: unknown;
	tool_choice?: unknown;
}

export type Fix = (body: Body) => Body;

export type Swap = (next: Block | null) => Body;

export type Wait = (ms: number) => Promise<void>;

export interface Part {
	kind: string;
	name: string | undefined;
	chars: number;
	without: () => Body;
}

export interface Row {
	kind: string;
	name: string | undefined;
	chars: number;
	tokens: number | null;
	note: string | null;
}

export interface Sizing {
	model: string | undefined;
	fixes: string[];
	full: number;
	parts: number;
	rest: number;
	rows: Row[];
}
