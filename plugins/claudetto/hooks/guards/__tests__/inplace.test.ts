import { describe, expect, test } from "claude-code/testing";

import { editsInPlace, REASON } from "../inplace";

describe("in-place edit guard", () => {
	test("finds sed and perl in-place edits direct, behind a wrapper, and with flags before the in-place flag", () => {
		// Arrange
		const edits = [
			"sed -i 's/a/b/' f.txt",
			"sed -i.bak 's/a/b/' f.txt",
			"sed --in-place 's/a/b/' f.txt",
			"sed -E -i 's/a/b/' f.txt",
			"sed -Ei 's/a/b/' f.txt",
			"sed -ni '1d' f.txt",
			"perl -pi -e 's/a/b/' f.txt",
			"perl -0pi -e 's/a/b/' f.txt",
			"perl -lpi -e 's/a/b/' f.txt",
			"perl -i.orig -pe 's/a/b/' f.txt",
			"perl -w -pi -e 's/a/b/' f.txt",
			"git grep -lw fetchUsr -- src | xargs perl -pi -e 's/fetchUsr/fetchUser/g'",
			"git grep -lz a | xargs -0 -n 1 sed -i 's/a/b/'",
			"find src -name '*.ts' -exec sed -i 's/a/b/' {} +",
			"find src -type f | xargs env LC_ALL=C sed -i 's/a/b/'",
			"cd src && sed -i 's/a/b/' f.txt",
			"for f in a b; do perl -pi -e 's/a/b/' $f; done",
			"echo start\nsed -i 's/a/b/' f.txt",
			"/usr/bin/sed -i 's/a/b/' f.txt",
			"{ sed -i 's/a/b/' f.txt\n} </dev/null"
		];

		// Act
		const missed = edits.filter((command) => !editsInPlace(command));

		// Assert
		expect(missed).toEqual([]);
	});

	test("leaves read-only sed and perl, and in-place flags named as text, alone", () => {
		// Arrange
		const others = [
			"echo hi",
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
		const flagged = others.filter((command) => editsInPlace(command));

		// Assert
		expect(flagged).toEqual([]);
	});

	test("a refused Bash call never reaches the tool, and the reason points to Edit", async ($, on) => {
		// Arrange: the stub stands in for the tool and records what reaches it.
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

		// Act
		const refused = await $.tool.call({
			tool: "Bash",
			command: "git grep -l x | xargs perl -pi -e 's/x/y/g'"
		});
		await $.tool.call({ tool: "Bash", command: "echo hi" });

		// Assert
		expect(refused).toEqual({ deny: REASON });
		expect(seen).toHaveLength(1);
		expect(seen[0]).toContain("\necho hi");
	});
});
