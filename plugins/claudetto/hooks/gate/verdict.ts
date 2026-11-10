export interface Verdict {
	decision: "deny" | "ask";
	reason: string;
}

export const deny = (reason: string): Verdict => ({ decision: "deny", reason });
export const ask = (reason: string): Verdict => ({ decision: "ask", reason });

export const fieldOf = (input: unknown, key: string): string | undefined => {
	const value: unknown =
		typeof input === "object" && input !== null
			? Object.entries(input).find(([k]) => k === key)?.[1]
			: undefined;
	return typeof value === "string" ? value : undefined;
};
