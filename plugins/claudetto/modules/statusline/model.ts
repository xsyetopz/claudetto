// The parts of a Claude model id. No import.

/** The model families of Claude Code 2.1.305. */
const FAMILIES = ["opus", "sonnet", "haiku", "fable", "mythos"] as const;

interface ModelId {
	family: (typeof FAMILIES)[number] | "unknown";
	major: number;
	minor: number | null;
}

const MODEL_ID = /claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?/i;

/**
 * The family, major, and minor version of a Claude model id, or `null` for any other id.
 * `claude-opus-5-5` gives `{ family: "opus", major: 5, minor: 5 }`, and `claude-haiku-5` gives `minor: null`.
 * A date suffix, such as `-20251001`, is not a minor version, and a family not in `FAMILIES` gives `"unknown"`.
 */
export const parseModel = (id: unknown): ModelId | null => {
	const m = MODEL_ID.exec(String(id ?? ""));
	if (!m) {
		return null;
	}
	const name = (m[1] ?? "").toLowerCase();
	return {
		family: FAMILIES.find((f) => f === name) ?? "unknown",
		major: Number(m[2]),
		minor: m[3] === undefined ? null : Number(m[3]),
	};
};
