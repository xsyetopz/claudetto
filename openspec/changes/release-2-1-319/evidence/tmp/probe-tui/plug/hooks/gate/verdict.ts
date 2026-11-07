export interface Verdict {
	decision: "deny" | "ask";
	reason: string;
}

export const deny = (reason: string): Verdict => ({ decision: "deny", reason });
export const ask = (reason: string): Verdict => ({ decision: "ask", reason });
