const LINE = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z) \[\w+\] (.*)$/;
const REQUEST = /^\[API REQUEST\] \/v1\/messages/;
const SETTLED = /^hooks module (\S+) (\S+) settled in ([\d.]+)ms/;

export type Mark =
	| { at: number; kind: "request"; text: string }
	| { at: number; kind: "settled"; text: string; module: string; event: string; ms: number }
	| { at: number; kind: "line"; text: string };

export const timeline = (debugLog: string): Mark[] => {
	const marks: Mark[] = [];
	let start: number | undefined;
	for (const line of debugLog.split("\n")) {
		const m = LINE.exec(line);
		if (!m) {
			continue;
		}
		const time = Date.parse(m[1] as string);
		start ??= time;
		marks.push(mark(time - start, m[2] as string));
	}
	return marks;
};

export const firstRequestAt = (marks: Mark[]): number | undefined => marks.find((m) => m.kind === "request")?.at;

export type Settle = Extract<Mark, { kind: "settled" }>;

export const settled = (marks: Mark[], module: string, event: string): Settle[] =>
	marks.filter((m): m is Settle => m.kind === "settled" && m.module === module && m.event === event);

// undefined when the log holds no request or no settle, so a missing mark never reads as a race lost or won.
export const settledBeforeFirstRequest = (marks: Mark[], module: string, event: string): boolean | undefined => {
	const request = firstRequestAt(marks);
	const first = settled(marks, module, event)[0];
	return request === undefined || first === undefined ? undefined : first.at <= request;
};

const mark = (at: number, text: string): Mark => {
	if (REQUEST.test(text)) {
		return { at, kind: "request", text };
	}
	const s = SETTLED.exec(text);
	return s
		? { at, kind: "settled", text, module: s[1] as string, event: s[2] as string, ms: Number(s[3]) }
		: { at, kind: "line", text };
};
