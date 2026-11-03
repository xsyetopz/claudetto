export interface OptionalTool {
	id: string;
	version: string;
	binaries: readonly string[];
	brew: string;
	release: string;
	agents: readonly string[];
}

export const AST_GREP: OptionalTool = {
	id: "ast-grep",
	version: "0.51.1",
	binaries: ["ast-grep", "sg"],
	brew: "ast-grep",
	/** `install.ts` appends `/<version>/app-<target>.zip`; `curl -sIL` on `.../0.51.1/app-aarch64-apple-darwin.zip` ended in `200`. */
	release: "https://github.com/ast-grep/ast-grep/releases/download",
	agents: ["Athena", "Hephaestus"],
};

export const OPTIONAL_TOOLS: readonly OptionalTool[] = [AST_GREP];
