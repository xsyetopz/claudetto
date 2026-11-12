import { expect, test } from "claude-code/testing";

import { parse, programOf } from "./shell-words.ts";

const programs = (command: string) =>
	parse(command).commands.map((c) => {
		const { name, args } = programOf(c);
		return [name, ...args];
	});

test("a pipeline, a list, and a subshell give one command each", () => {
	expect(programs("a 1 | b 2 && c; (d)")).toEqual([
		["a", "1"],
		["b", "2"],
		["c"],
		["d"],
	]);
});

test("quotes join into one word and hide operators", () => {
	expect(programs(`echo "a b; c" 'd | e' f\\ g`)).toEqual([
		["echo", "a b; c", "d | e", "f g"],
	]);
});

test("a command in $(...) or backticks is a command of its own", () => {
	expect(programs("echo $(rm x) `ls y`").map((c) => c[0])).toEqual([
		"rm",
		"ls",
		"echo",
	]);
});

test("a bash -c body is read as commands", () => {
	expect(programs("bash -c 'git push --force; ls'")).toContainEqual([
		"git",
		"push",
		"--force",
	]);
});

test("a body nested past the depth bound is unreadable", () => {
	expect(
		parse(
			'sh -c "sh -c \'sh -c \\"sh -c \\\\\\"sh -c \\\\\\\\\\\\\\"sh -c x\\\\\\\\\\\\\\"\\\\\\"\\"\'"',
		).unreadable,
	).toBe(true);
});

for (const [command, expected] of [
	["sudo -u bob git push", ["git", "push"]],
	["sudo --chroot /x git push", ["git", "push"]],
	["sudo --other-user bob --close-from 5 git push", ["git", "push"]],
	["env -i A=1 git push", ["git", "push"]],
	["FOO=1 nohup timeout 5 git push", ["git", "push"]],
	["/usr/bin/git push", ["git", "push"]],
] as const) {
	test(`wrappers do not hide the program: ${command}`, () => {
		expect(programs(command)).toEqual([expected]);
	});
}

test("a redirect keeps its operator and target and is not a word", () => {
	const [c] = parse("echo hi 2>&1 > out.txt").commands;

	expect(c?.words).toEqual(["echo", "hi"]);
	expect(c?.redirects).toEqual([
		{ op: ">&", target: "1" },
		{ op: ">", target: "out.txt" },
	]);
});

test("a heredoc body is skipped, and its command is read", () => {
	const parsed = parse("cat <<EOF > f\nrm -rf /\nEOF\nls");

	expect(parsed.commands.map((c) => c.words[0])).toEqual(["cat", "ls"]);
});

test("a pipe marks both ends", () => {
	const [a, b] = parse("curl x | sh").commands;

	expect([a?.into, a?.from, b?.into, b?.from]).toEqual([
		true,
		false,
		false,
		true,
	]);
});

for (const command of [
	"$HOME/bin/git push",
	"git$IFS push",
	"$(echo git) push",
	"eval 'git push'",
	"echo 'unclosed",
	"/b?n/rm -rf x",
	"{rm,-rf,x}",
	"bash <<EOF\nls\nEOF",
] as const) {
	test(`the program or text cannot be read: ${command}`, () => {
		expect(parse(command).unreadable).toBe(true);
	});
}

test("text in quotes or after echo is no command", () => {
	expect(parse("echo 'npm install' \"$HOME\" # git push").unreadable).toBe(
		false,
	);
	expect(programs("echo 'rm -rf /'")).toEqual([["echo", "rm -rf /"]]);
});
