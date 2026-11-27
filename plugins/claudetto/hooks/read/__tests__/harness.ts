import type { On } from "claude-code";

export const CWD = "/repo";

/** What osascript answers: its exit code and streams. */
export interface PdfAnswer {
	exitCode: number;
	stdout: string;
	stderr: string;
}

const NO_PDF: PdfAnswer = { exitCode: 0, stdout: "", stderr: "" };

/** Serves `files` for text and byte reads, and `pdf` as the answer of osascript. */
export function wire(
	on: On,
	files: Record<string, string>,
	pdf: PdfAnswer = NO_PDF
): void {
	// Nothing beneath the plugin answers a permission check, so each tool is allowed.
	on("tool.check", () => ({ decision: "allow" }));
	on("session.cwd", () => ({ value: CWD }));
	on("session.id", () => ({ value: "s1" }));
	on("fs.read", (_$, e) => {
		const text = files[e.path];
		if (text === undefined) {
			return { deny: "ENOENT" };
		}
		return { value: e.as === "bytes" ? { base64: btoa(text) } : text };
	});
	// The path-scoped rule lookup: no rules directory, no nested CLAUDE.md, HOME unset.
	on("fs.exists", (_$, e) => ({ value: e.path in files }));
	on("fs.ancestors", () => ({ value: [] }));
	on("env.get", () => ({ value: undefined }));
	on("process.run", () => ({
		value: { ...pdf, isStdoutTruncated: false, isStderrTruncated: false }
	}));
}
