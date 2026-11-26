import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { inOrder } from "./in-order";

/** The Bash tool beneath the plugin's hooks; returns the commands that reached it. */
const world = (on: On): string[] => {
	const seen: string[] = [];
	on("tool.check", () => ({ decision: "allow" }));
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: "System-wide memory free percentage: 50%\n",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	on("tool.call", { tool: "Bash" }, (_$, e) => {
		if (e.tool === "Bash") {
			seen.push(e.command);
		}
		return { result: "ok" };
	});
	return seen;
};

/** A body of `n` lines of source text. */
const body = (n: number): string =>
	Array.from({ length: n }, (_, i) => `line ${i} of the file`).join("\n");

describe("large heredoc file write guard", () => {
	test("a file written through a large heredoc is refused, whichever way it is redirected", async ($, on) => {
		// Arrange
		const seen = world(on);
		const writes = [
			`cat > app.ts <<'EOF'\n${body(60)}\nEOF`,
			`cat >> notes.md <<EOF\n${body(60)}\nEOF`,
			`cat <<EOF > out.txt\n${body(60)}\nEOF`,
			`cd src && cat > "a b.ts" <<-"END"\n${body(60)}\n\tEND\necho done`,
			`tee conf.yaml <<EOF\n${body(60)}\nEOF`
		];

		// Act
		await inOrder(writes, (command) => $.tool.call({ tool: "Bash", command }));

		// Assert
		expect(seen).toEqual([]);
	});

	test("the refusal names the patch tool and its Add File form, and the next call still runs", async ($, on) => {
		// Arrange
		const seen = world(on);

		// Act
		const refused = await $.tool.call({
			tool: "Bash",
			command: `cat > app.ts <<'EOF'\n${body(60)}\nEOF`
		});
		await $.tool.call({ tool: "Bash", command: "echo hi" });

		// Assert
		expect(refused.deny).toContain("mcp__claudetto__patch");
		expect(refused.deny).toContain("Add File");
		expect(seen).toHaveLength(1);
	});

	test("a small heredoc file write and a large heredoc fed to a program run", async ($, on) => {
		// Arrange
		const seen = world(on);
		const others = [
			`cat > small.txt <<EOF\n${body(10)}\nEOF`,
			`python3 - <<'PY'\n${body(80)}\nPY`,
			`psql mydb <<SQL\n${body(80)}\nSQL`,
			`cat <<EOF | grep line\n${body(80)}\nEOF`,
			`bash -s <<EOF > run.log\n${body(80)}\nEOF`,
			`echo "cat > f <<EOF"\n${body(80)}`,
			"echo hi"
		];

		// Act
		await inOrder(others, (command) => $.tool.call({ tool: "Bash", command }));

		// Assert
		expect(seen).toHaveLength(others.length);
	});
});
