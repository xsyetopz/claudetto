import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const RULES = "/home/u/.claude/rules/claudetto";

const LAWS = "/rules/laws";

/** Serves the shipped `laws`, an in-memory file system holding `files`, and a store to a session start. */
const serve = (
	on: On,
	laws: Record<string, string>,
	files: Record<string, string> = {},
	seed: Record<string, unknown> = {}
) => {
	const fs = new Map<string, string>(Object.entries(files));
	const shipped = (path: string): string | undefined => {
		const cut = path.lastIndexOf(`${LAWS}/`);
		return cut === -1 ? undefined : laws[path.slice(cut + LAWS.length + 1)];
	};
	fs.set("/home/u/.claude/settings.json", "{}");
	const store = new Map<string, unknown>(Object.entries(seed));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined
	}));
	on("settings.read", () => ({ value: {} }));
	on("fs.list", (_$, e) => ({
		value: (e.path.endsWith(LAWS) ? Object.keys(laws) : []).map((name) => ({
			name,
			kind: "file",
			size: 1,
			mtimeMs: 0,
			isLink: false
		}))
	}));
	on("fs.exists", (_$, e) => ({ value: fs.has(e.path) }));
	on("fs.read", (_$, e) => ({
		value: shipped(e.path) ?? fs.get(e.path) ?? ""
	}));
	on("fs.write", (_$, e) => {
		fs.set(e.path, e.text);
		return { value: undefined };
	});
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("command.run", () => ({ text: "Reloaded" }));
	return { fs };
};

const start = { cwd: "/home/u/p", surface: null, isInteractive: true } as const;

describe("rules installed by setup", () => {
	test("a first start puts each shipped law in the user rules folder", async ($, on) => {
		// Arrange
		const { fs } = serve(on, { "galls-law.md": "# Gall\n" });

		// Act
		await $.session.start(start);

		// Assert
		expect(fs.get(`${RULES}/galls-law.md`)).toBe("# Gall\n");
	});

	test("a rule the user edited stays as they left it when the release changes it", async ($, on) => {
		// Arrange
		const { fs } = serve(
			on,
			{ "galls-law.md": "# Gall v2\n" },
			{ [`${RULES}/galls-law.md`]: "# mine\n" },
			{ "rules.written": { "galls-law.md": "# Gall\n" } }
		);

		// Act
		await $.session.start(start);

		// Assert
		expect(fs.get(`${RULES}/galls-law.md`)).toBe("# mine\n");
	});

	test("an unedited rule takes the new release's text", async ($, on) => {
		// Arrange
		const { fs } = serve(
			on,
			{ "galls-law.md": "# Gall v2\n" },
			{ [`${RULES}/galls-law.md`]: "# Gall\n" },
			{ "rules.written": { "galls-law.md": "# Gall\n" } }
		);

		// Act
		await $.session.start(start);

		// Assert
		expect(fs.get(`${RULES}/galls-law.md`)).toBe("# Gall v2\n");
	});

	test("a rule the user removed stays removed", async ($, on) => {
		// Arrange
		const { fs } = serve(
			on,
			{ "galls-law.md": "# Gall\n" },
			{},
			{ "rules.written": { "galls-law.md": "# Gall\n" } }
		);

		// Act
		await $.session.start(start);

		// Assert
		expect(fs.has(`${RULES}/galls-law.md`)).toBe(false);
	});

	test("a law the release retires is emptied while it holds claudetto's text", async ($, on) => {
		// Arrange
		const { fs } = serve(
			on,
			{ "galls-law.md": "# Gall\n" },
			{ [`${RULES}/old-law.md`]: "# Old\n" },
			{ "rules.written": { "old-law.md": "# Old\n" } }
		);

		// Act
		await $.session.start(start);

		// Assert
		expect(fs.get(`${RULES}/old-law.md`)).toBe("");
	});
});
