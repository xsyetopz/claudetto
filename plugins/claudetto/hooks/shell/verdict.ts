export const deny = (reason: string) => ({ decision: "deny" as const, reason });

export const fieldOf = (input: unknown, key: string): string | undefined => {
	const value: unknown =
		typeof input === "object" && input !== null
			? Object.entries(input).find(([k]) => k === key)?.[1]
			: undefined;
	return typeof value === "string" ? value : undefined;
};
