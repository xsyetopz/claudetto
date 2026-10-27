// The wrong tool and the commands that the permission check of Claude Code cannot read (the user, 2026-10-27).

import { expect, test } from "bun:test";
import { wrongTool } from "../../../plugins/claudetto/modules/gate/domain/wrongtool.ts";

// The wrong tool and the commands that the permission check of Claude Code cannot read (the user, 2026-10-27).
for (const [command, tool] of [
	["cat a.txt", "Read"],
	["head -n 5 a.txt", "Read"],
	["tail -20 a.txt | grep x", "Read"],
	["cat README.md", "Read"],
	["cat -n src/a.ts", "Read"],
	["for f in a b; do cat README.md; done", "Read"],
] as const) {
	test(`\`${command}\` is denied with a reason that names \`${tool}\``, () => {
		const reason = wrongTool(command);

		expect(reason).toContain(`\`${tool}\``);
	});
}

for (const command of [
	"bun -e 'console.log(1)'",
	"node --eval 'console.log(1)'",
	"python3 -c 'print(1)'",
	"python3 -m pytest -c pytest.ini",
	"perl -e 'print 1'",
	"deno eval 'console.log(1)'",
	"echo x | python3 -c 'print(1)'",
	'for f in a b; do echo "$f"; done',
	"cd src && for f in *.ts; do wc -l $f; done",
	"find . -name '*.tmp' -delete",
	"find . -mtime +7 -exec rm {} +",
	"find . -newer a -size +1M",
	"find . -name x -printf '%p'",
	"find . -empty",
	"find . -perm 644 -prune",
	"cat a.txt b.txt > all.txt",
	"cat - > f",
	"cat a b",
	"cat a >> log",
	"cat - a",
	"grep -rn foo src",
	"egrep foo src/a.ts",
	"fgrep -n foo a.txt",
	"rg foo src",
	"cd src && grep -e foo a.ts",
	"true; rg foo .",
	"GREP_COLOR=1 grep foo a.txt | head -5",
	"grep foo a.txt 2>&1",
	"find . -name '*.ts'",
	"false || find src | wc -l",
	"grep -fe a.txt",
	"grep -ie foo a.txt",
	"find src -name '*.ts'",
	"find . -type f",
	"find . -maxdepth 2 -iname 'a*' -type d -print",
	"grep -ie foo",
	"grep -if foo",
]) {
	test(`\`${command}\` is not denied`, () => {
		const reason = wrongTool(command);

		expect(reason).toBeUndefined();
	});
}

for (const command of [
	"git log | grep x",
	"ps -A | grep probe",
	"cmd | head -5",
	"git diff | grep -n x | head -3",
	"git log && ps -A | grep probe",
	"cat <<EOF > f\nfind . -name x\nEOF",
	"cat <<'EOF' | wc -l\ngrep foo src\nEOF",
	"echo 'grep foo src'",
	'echo "a; grep foo src; cat a.txt"',
	"git grep foo src",
	"just test",
	"bun test",
	"bun run script.ts",
	"python3 script.py",
	"node script.js",
	"python3 - <<'EOF'\nprint(1)\nEOF",
	"echo ls",
	"git commit -m 'grep for loops'",
	"ls -la",
	"ls src",
	"cd /tmp && ls -t 'old files'",
	"tail -f /tmp/x.log",
	"tail -F /tmp/x.log",
	"tail -n 20 -f /tmp/x.log",
	"sed -n 1,5p README.md",
	"cd /tmp && sed -i '' 's/a/b/' f.txt",
	"cd ../claude-code-docs && git log -3",
	"mkdir -p .claude/x && cp a b",
	"mv .env .env.bak",
	"grep foo",
	"cat",
	"while true; do sleep 1; done",
]) {
	test(`\`${command}\` is not denied for its tool`, () => {
		const reason = wrongTool(command);

		expect(reason).toBeUndefined();
	});
}
