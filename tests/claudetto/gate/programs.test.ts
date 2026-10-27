// The program word of the gate: the program that runs, not the word that the text spells, with aliases, shells, and env-file names that the gate resolves or asks for.

import { expect, test } from "bun:test";
import type { Facts } from "../../../plugins/claudetto/modules/gate/domain/gate.ts";
import { bash, facts } from "./facts-stub.ts";

const DOLLAR = "$";

// "Program Word": the gate judges the program that runs, not the word that the text spells.
const XCODE_GIT = "/Applications/Xcode.app/Contents/Developer/usr/bin/git";
const CLT_GIT = "/Library/Developer/CommandLineTools/usr/bin/git";
for (const [command, decision] of [
	[
		`G=${XCODE_GIT}; $G push --force-with-lease=main:cab2a44 origin main; $G ls-remote origin main; $G rev-parse main`,
		"ask",
	],
	[
		`export DEVELOPER_DIR=/Library/Developer/CommandLineTools; G=${CLT_GIT}; $G push --force-with-lease=main:cab2a44 origin main`,
		"ask",
	],
	["V=rm; $V -rf ~", "deny"],
	[`G=git; ${DOLLAR}{G} reset --hard`, "ask"],
	["export G=git; $G clean -fdx", "ask"],
	["/usr/bin/git push --force", "ask"],
	["git -c alias.p='push --force' p", "ask"],
	["git -c alias.x='!rm -rf ~' x", "deny"],
	["G=$(which git); $G push -f", "ask"],
	["read G; $G status", "ask"],
	["G=git; G=$(which git); $G status", "ask"],
	["G=git; $G status", "allow"],
	["/usr/bin/git log", "allow"],
	["X=1; echo $X", "allow"],
	["git -c core.pager=cat log", "ask"],
	["git -c color.ui=always log", "allow"],
] as const) {
	test(`\`${command}\` gets \`${decision}\``, async () => {
		const f = facts("/p");

		const v = await bash(command, f);

		expect(v.decision).toBe(decision);
	});
}

// "Program Word, Part 2": text that builds the program, the script, or the alias; the gate resolves it or asks, and never allows what it cannot read.
const withGit = (aliases: Record<string, string>): Facts => ({
	...facts(),
	gitConfig: async () => ({
		aliases,
		commands: ["status", "log", "push", "add", "commit", "reset"],
	}),
});
const STUBBED = withGit({ p: "push --force", st: "status" });
const SHELLS = [
	["D=/usr/bin; $D/git push --force", "ask"],
	["X=/opt; $X/$Y rm", "ask"],
	["c='git push --force'; bash -c \"$c\"", "ask"],
	['eval "$(cat x)"', "ask"],
	[
		"GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.p GIT_CONFIG_VALUE_0='push --force' git p",
		"ask",
	],
	["git config alias.p 'push --force'; git p", "ask"],
	["git p", "ask", STUBBED],
	["git zzz", "ask", STUBBED],
	["git -calias.p='push --force' p", "ask"],
	["git -c alias.a='b' -c alias.b='push --force' a", "ask"],
	["if false; then G=echo; else G=git; fi; $G push --force", "ask"],
	["(G=git); G=echo; $G push --force", "ask"],
	["true && G=git; $G push --force", "ask"],
	["G=echo; for G in git; do :; done; $G push --force", "ask"],
	["f() { G=git; }; G=echo; f; $G push --force", "ask"],
	["case x in x) G=git;; esac; $G push --force", "ask"],
	["git -c alias.a=b -c alias.b=a a", "ask"],
	["git --config-env=alias.p=X p", "ask"],
	["GIT_CONFIG_PARAMETERS=\"'alias.p=push --force'\" git p", "ask"],
	["X=--force; git push $X origin main", "ask"],
	["F='-rf ~'; rm $F", "deny"],
	["F='-rf ~'; rm $F\"\"", "deny"],
	["F='-rf ~'; rm $F''", "deny"],
	[`F='-rf ~'; rm ${DOLLAR}{F}""`, "deny"],
	["X=echo; Y='$X'; X=git; eval \"$Y push --force\"", "ask"],
	["X=echo; Y='$X'; X=git; bash -c \"$Y push --force\"", "ask"],
	["X=echo; export Y='$X'; X=git; eval \"$Y push --force\"", "ask"],
	["F='c d'; G='e f'; rm {a,b}\"$G\"$F", "ask"],
	['x=--force; bash -c "git push $x"', "ask"],
	["X=--force; Y=origin; git push $X $Y main", "ask"],
	["G=echo; unset G; $G push --force", "ask"],
	["G=echo; printf -v G git; $G push --force", "ask"],
	["G=echo; getopts ab G; $G push --force", "ask"],
	['A=git; A+=" push --force"; $A', "ask"],
	['A=rm; A+=" -rf /"; $A', "ask"],
	["X=ls; for i in 1 2; do $X /; X=rm; done", "ask"],
	["X=ls; f() { $X /; }; X=rm; f", "ask"],
	["X=rm; declare -n r=X; $r -rf /", "ask"],
	["X=rm; typeset -n r=X; $r -rf /", "ask"],
	["X=rm; local -n r=X; $r -rf /", "ask"],
	["declare -x G=git; G=echo; declare -r H=ls; $H /", "allow"],
	['for f in *.ts; do cat "$f"; done', "allow"],
	["M=hi; echo $M", "allow"],
	['f=a.txt; cat "$f"', "allow"],
	["G=git; G=echo; $G push --force", "allow"],
	["eval git status", "allow"],
	["G=git; $G status", "allow"],
	["D=/usr/bin; $D/git log", "allow"],
	["c='ls -la'; bash -c \"$c\"", "allow"],
	["git st", "allow", STUBBED],
	["git status", "allow"],
	["X=1; echo $X", "allow"],
] as const;
for (const [command, decision, f] of SHELLS) {
	test(`\`${command}\` gets \`${decision}\` (part 2)`, async () => {
		const v = await bash(command, f ?? facts());

		expect(v.decision).toBe(decision);
	});
}

// Defects 1 and 2 of the 20.2 review: the alias facts are those of the config of the session folder, so a call that changes the config scope gets no alias of them, and a file name that the gate cannot read asks when the project has an env file.
const SCOPED = withGit({ co: "checkout" });
for (const [command, decision] of [
	["git co", "allow"],
	["git -C /tmp/r status", "allow"],
	[
		"printf '[alias]\\n co = !touch /tmp/pwn\\n' > /tmp/r/.git/config; git -C /tmp/r co",
		"ask",
	],
	["cd /tmp/r && git co", "ask"],
	["GIT_DIR=/tmp/r/.git git co", "ask"],
	["GIT_CONFIG_GLOBAL=/tmp/g git co", "ask"],
	["HOME=/tmp/h git co", "ask"],
	["git --git-dir=/tmp/r/.git co", "ask"],
	["git --git-dir /tmp/r/.git co", "ask"],
	["git --work-tree=/tmp/r co", "ask"],
	["GIT_CONFIG=/tmp/g git co", "ask"],
	["XDG_CONFIG_HOME=/tmp/x git co", "ask"],
	["env HOME=/tmp/h git co", "ask"],
	["export HOME=/tmp/h; git co", "ask"],
] as const) {
	test(`\`${command}\` gets \`${decision}\` with the alias \`co\` in the config of the session folder`, async () => {
		const v = await bash(command, SCOPED);

		expect(v.decision).toBe(decision);
	});
}

const withEnvFile = (isThere: boolean): Facts => ({
	...facts(),
	hasEnvFile: async () => (isThere ? [".env"] : []),
});
for (const command of [
	'cat $(printf ".e%s" nv)',
	'printf ".e%s\\n" nv | xargs cat',
	'f=$(printf ".e%s" nv); cat "$f"',
	"cat `printf '.e%s' nv`",
	'cat "$UNSET"',
]) {
	for (const [isThere, decision] of [
		[true, "ask"],
		[false, "allow"],
	] as const) {
		test(`\`${command}\` gets \`${decision}\` when the project ${isThere ? "has" : "has no"} env file`, async () => {
			const v = await bash(command, withEnvFile(isThere));

			expect(v.decision).toBe(decision);
		});
	}
}

const withEnvNames = (names: readonly string[] | undefined): Facts => ({
	...facts(),
	hasEnvFile: async () => names,
});
// A word with `$` asks only when its file name can be a found env file name: the pattern of `grep` is no file, and the literal tail of the word can rule a name out.
for (const [command, names, decision] of [
	['grep -c -- "$n" file', [".env"], "allow"],
	['grep -rlE -- "$n" plugins tools', [".env"], "allow"],
	['grep "$n" "$f"', [".env"], "ask"],
	['grep -c -- "$n" file', undefined, "allow"],
	['grep -F -o -f "$f" target', [".env"], "ask"],
	['grep --file "$f" target', [".env"], "ask"],
	['sed -f "$f" x', [".env"], "ask"],
	['awk -f "$f" x', [".env"], "ask"],
	['grep -e foo "$f"', [".env"], "ask"],
	['sed -e p "$f"', [".env"], "ask"],
	['grep -e "$p" file', [".env"], "allow"],
	["grep -f /tmp/old-$k.txt target", [".env"], "allow"],
	["cat /tmp/old-$k.txt", [".env"], "allow"],
	["cat /tmp/old-$k.txt", [".env", "prod.env"], "allow"],
	["cat /tmp/old-$k.txt", undefined, "ask"],
	["cat $x.env", [".env"], "ask"],
	["cat $x/.env", [".env"], "ask"],
	["cat $x/.env.local", [".env"], "ask"],
	["cat $x/notes.txt", [".env"], "allow"],
	["cat $x/", [".env"], "allow"],
	['cat "$f"', [".env"], "ask"],
	["cat $f", undefined, "ask"],
	["cat $x*", [".env"], "ask"],
	["cat $x$y", [".env"], "ask"],
	["cat $(a $(b) c).env", [".env"], "ask"],
	["cat $x.txt $f", [".env"], "ask"],
	["cat $x.txt $y.log", [".env"], "allow"],
	["cat $x.txt $f", [], "allow"],
	["printf x | xargs cat", [".env"], "ask"],
	// A file of a `-f` option is read, so a secret name there is a secret read.
	["grep -f .env x", [".env"], "deny"],
	["grep -F -o -f .env x", [".env"], "deny"],
	["sed -f .env x", [".env"], "deny"],
	["awk -f .env x", [".env"], "deny"],
	["grep -e foo .env", [".env"], "deny"],
	["grep .env notes.txt", [".env"], "allow"],
	// A short cluster ends at its first letter that takes a value: `-fe` is `-f` with the file `e`, so the next word is a file.
	["grep -fe .env", [".env"], "deny"],
	["grep -fe .env x", [".env"], "deny"],
	["sed -fe .env", [".env"], "deny"],
	["awk -fe .env", [".env"], "deny"],
	['grep -fe "$f"', [".env"], "ask"],
] as const) {
	test(`\`${command}\` gets \`${decision}\` with the env names ${JSON.stringify(names)}`, async () => {
		const f = withEnvNames(names);

		const v = await bash(command, f);

		expect(v.decision).toBe(decision);
	});
}

// Task 20.2, change A (the user, 2026-10-26): an alias of the config of the session folder is known only when the whole text is one plain `git` call. Each other text reads only the built-in verbs, so the gate asks for an alias.
for (const body of ["!git push --force", "status"]) {
	for (const command of [
		"GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=include.path GIT_CONFIG_VALUE_0=/t/x git p",
		"GIT_CONFIG_PARAMETERS=\"'include.path=/t/x'\" git p",
		"git --config-env include.path=V p",
		"git -c include.path=/t/x p",
		"git -C /x p",
		"git --git-dir=/x/.git p",
		"git --work-tree=/x p",
		"git --exec-path=/x p",
		"X=1 bash -c 'git p'",
		"env -C /x git p",
		"xargs git p",
		"eval 'git p'",
		"f(){ git p; }; cd /x; f",
		"source ./f; git p",
		"echo x > .git/config; git p",
		"sed -i s/a/b/ .git/config; git p",
		"git config --file .git/config alias.p x; git p",
		"git p && git status",
		"git status | git p",
		"(git p)",
		"git p > /t/o",
	]) {
		test(`\`${command}\` gets \`ask\` with the alias \`p = ${body}\` in the config of the session folder`, async () => {
			const f = withGit({ p: body });

			const v = await bash(command, f);

			expect(v.decision).toBe("ask");
		});
	}
}

for (const [command, aliases, decision] of [
	["git p", { p: "status" }, "allow"],
	["git -c core.pager=cat p", { p: "status" }, "ask"],
	["git --no-pager p", { p: "status" }, "allow"],
	["git -c alias.q=status q", { p: "!git push --force" }, "allow"],
	["git -c alias.q=p q", { p: "status" }, "allow"],
	["git p", { p: "!git push --force" }, "ask"],
	["git p", { p: "!git q", q: "status" }, "allow"],
	["git p", { p: "!git q && git status", q: "status" }, "ask"],
	["git p", { p: "!git -C /x q", q: "status" }, "ask"],
	["git status && git pull", { p: "status" }, "allow"],
	["git co main && git pull", { co: "checkout" }, "ask"],
] as const) {
	test(`\`${command}\` gets \`${decision}\` with the aliases ${JSON.stringify(aliases)}`, async () => {
		const f = withGit(aliases);

		const v = await bash(command, f);

		expect(v.decision).toBe(decision);
	});
}

// Task 20.2, change B (the user, 2026-10-26): with an env file, any program asks for an operand that the gate cannot read in full.
for (const [command, decision, isThere] of [
	["python3 $(printf x)", "ask", true],
	["perl $f", "ask", true],
	["rev $(printf x)", "ask", true],
	["printf x | xargs python3", "ask", true],
	["python3 `printf x`", "ask", true],
	['git commit -m "$(date)"', "ask", true],
	["python3 $(printf x)", "allow", false],
	["perl $f", "allow", false],
	["rev $(printf x)", "allow", false],
	["printf x | xargs python3", "allow", false],
	["gh pr create --title 'Cost $5 of `parse_args`'", "allow", true],
	['perl "it\'s" $f "don\'t"', "ask", true],
	["git commit -m ''", "allow", true],
	["echo $(date)", "allow", true],
	["echo $(date)", "allow", false],
	["git commit -m \"$(cat <<'EOF'\nfix the parser\nEOF\n)\"", "allow", true],
	["git commit -m \"$(cat <<'EOF'\nfix $(rm -rf x)\nEOF\n)\"", "allow", true],
	["cat \"$(cat <<'EOF'\n.env\nEOF\n)\"", "ask", true],
	['git commit -m "$(cat <<EOF\nfix $(date)\nEOF\n)"', "ask", true],
] as const) {
	test(`\`${command}\` gets \`${decision}\` when the project ${isThere ? "has" : "has no"} env file`, async () => {
		const f = withEnvFile(isThere);

		const v = await bash(command, f);

		expect(v.decision).toBe(decision);
	});
}
