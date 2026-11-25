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

describe("in-place edit guard", () => {
	test("a sed in-place edit is refused direct, behind a wrapper, and with flags before the in-place flag", async ($, on) => {
		// Arrange
		const seen = world(on);
		const edits = [
			"sed -i 's/a/b/' f.txt",
			"sed -i.bak 's/a/b/' f.txt",
			"sed --in-place 's/a/b/' f.txt",
			"sed -E -i 's/a/b/' f.txt",
			"sed -Ei 's/a/b/' f.txt",
			"sed -ni '1d' f.txt",
			"sed -i '' 's/a/b/' f.txt",
			"git grep -lz a | xargs -0 -n 1 sed -i 's/a/b/'",
			"find src -name '*.ts' -exec sed -i 's/a/b/' {} +",
			"find src -type f | xargs env LC_ALL=C sed -i 's/a/b/'",
			"sudo sed -i 's/a/b/' f.txt",
			"cd src && sed -i 's/a/b/' f.txt",
			"for f in a b; do sed -i 's/a/b/' $f; done",
			"echo start\nsed -i 's/a/b/' f.txt",
			"cat <<EOF\nhi\nEOF\nsed -i 's/a/b/' f.txt",
			"/usr/bin/sed -i 's/a/b/' f.txt",
			"{ sed -i 's/a/b/' f.txt\n} </dev/null"
		];

		// Act
		await inOrder(edits, (command) => $.tool.call({ tool: "Bash", command }));

		// Assert
		expect(seen).toEqual([]);
	});

	test("perl edits, read-only sed, and in-place flags named as text or in a heredoc run", async ($, on) => {
		// Arrange
		const seen = world(on);
		const others = [
			"echo hi",
			"perl -pi -e 's/a/b/' f.txt",
			"perl -0pi -e 's/a/b/' f.txt",
			"perl -lpi -e 's/a/b/' f.txt",
			"git grep -lz a | xargs -0 perl -0pi -e 's/a/b/g'",
			"cat > f.sh <<'EOF'\nsed -i 's/a/b/' f.txt\nEOF",
			"cat <<EOF\nit's\nsed -i x\nEOF\necho done",
			"sed -n '1,5p' f.txt",
			"sed -e 's/a/b/' f.txt",
			"sed -E 's/a/b/' f.txt",
			"sed 's/ -i / --in-place /' README.md",
			"perl -ne 'print if /x/' f.txt",
			"perl -MFile::Spec -e 'print 1'",
			"perl -Ilib -e 'print 1'",
			"perl -e 'print \"-pi\"'",
			"echo 'run sed -i here'",
			'git commit -m "never use perl -pi"',
			"grep -n sed f.txt | wc -l",
			"cat sed-notes-in-place.txt"
		];

		// Act
		await inOrder(others, (command) => $.tool.call({ tool: "Bash", command }));

		// Assert
		expect(seen).toHaveLength(others.length);
	});

	test("a refused Bash call never reaches the tool, and the reason points to the patch tool", async ($, on) => {
		// Arrange
		const seen = world(on);

		// Act
		const refused = await $.tool.call({
			tool: "Bash",
			command: "git grep -l x | xargs sed -i 's/x/y/g'"
		});
		await $.tool.call({ tool: "Bash", command: "echo hi" });

		// Assert
		expect(refused.deny).toContain("patch");
		expect(seen).toHaveLength(1);
		expect(seen[0]).toContain("echo hi");
	});
});
