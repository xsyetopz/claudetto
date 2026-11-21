/** The ordinary work turns that fill the replayed session's body. */
import { MODULES } from "./repo";
import type { Session } from "./session";
import { cap, Work } from "./work";

/** The history stops growing once the session's own token estimate passes this. */
const BODY_TOKENS = 135_000;

type Mod = (typeof MODULES)[number];
type TurnKind = "tweak" | "helper" | "investigate" | "git";

function tweak(work: Work, mod: Mod, noun: string): void {
	const s = work.session;
	const path = `src/${mod.name}.js`;
	s.user(
		`The ${noun} rate in ${path} is a cent too low after the supplier change. Raise it one point and make sure the ${mod.name} tests still pass.`
	);
	work.grep(`DEFAULT_${noun.toUpperCase()}_RATE`, "src");
	work.read(path);
	const next = work.bumpConstant(mod.name, noun);
	work.read(`test/${mod.name}.test.js`);
	work.testRun(mod.name);
	s.reply(
		`Raised DEFAULT_${noun.toUpperCase()}_RATE in ${path} to ${next}. The ${mod.name} tests pass; none of them pin the rate, so nothing else needed to change.`
	);
}

function helper(work: Work, mod: Mod, noun: string): void {
	const s = work.session;
	const path = `src/${mod.name}.js`;
	s.user(
		`Add a small helper to ${path} that describes the ${noun} rule in words, with a test, so support can quote it.`
	);
	work.read(path, 1, 60);
	work.read(`test/${mod.name}.test.js`);
	const name = `describe${cap(noun)}Rule`;
	const anchor = `export function summarize${cap(mod.name)}(`;
	const up = noun.toUpperCase();
	work.edit(
		path,
		anchor,
		`/**\n * Describes the ${noun} rule in words.\n *\n * @returns {string} One sentence for support.\n */\nexport function ${name}() {\n  return \`${cap(noun)} applies at \${DEFAULT_${up}_RATE * 100}% plus \${FLAT_${up}_CENTS} cents, capped at \${MAX_${up}_CENTS} cents.\`;\n}\n\n${anchor}`
	);
	const count = work.testCounts.get(mod.name) ?? 0;
	work.edit(
		`test/${mod.name}.test.js`,
		"  });\n});\n",
		`  });\n\n  test("added case ${count - mod.nouns.length * 2 + 1}", () => {\n    expect(typeof pricing.${name}()).toBe("string");\n  });\n});\n`
	);
	work.testCounts.set(mod.name, count + 1);
	work.testRun(mod.name);
	s.reply(
		`Added ${name} to ${path} and a test for it in test/${mod.name}.test.js. The ${mod.name} suite passes.`
	);
}

function investigate(work: Work, mod: Mod, noun: string): void {
	const s = work.session;
	const path = `src/${mod.name}.js`;
	s.user(
		`Where does ${noun} get its cap from, and does ${mod.name} use it anywhere besides ${path}?`
	);
	work.grep(`MAX_${noun.toUpperCase()}_CENTS`, ".");
	work.read(path, 1, 40);
	work.read(`test/${mod.name}.test.js`, 1, 30);
	s.reply(
		`The cap is MAX_${noun.toUpperCase()}_CENTS, defined at the top of ${path} and read only by compute${cap(noun)} in the same file. Nothing else imports it.`
	);
}

function git(work: Work): void {
	const s = work.session;
	if (work.dirty.size === 0) {
		s.user("What does the tree look like right now?");
		work.bash("git status --short", "Show changed files", "");
		s.reply("Clean: nothing is modified.");
		return;
	}
	const changed = [...work.dirty].toSorted();
	s.user("Show me what is modified and commit it.");
	work.bash(
		"git status --short",
		"Show changed files",
		changed.map((f) => ` M ${f}`).join("\n")
	);
	work.bash(
		`git add -A && git commit -q -m "chore: pricing tweaks" && git log --oneline -1`,
		"Commit the changes",
		`${(1000 + changed.length * 37).toString(16).padStart(7, "0")} chore: pricing tweaks`
	);
	work.dirty.clear();
	s.reply(
		`Committed ${changed.length} changed file${changed.length === 1 ? "" : "s"} as "chore: pricing tweaks".`
	);
}

function turn(work: Work, kind: TurnKind): void {
	const mod = work.pick(MODULES);
	const noun = work.pick(mod.nouns);
	if (kind === "tweak") {
		tweak(work, mod, noun);
	} else if (kind === "helper") {
		helper(work, mod, noun);
	} else if (kind === "investigate") {
		investigate(work, mod, noun);
	} else {
		git(work);
	}
}

/** The shared body of both histories: orientation, then edit, test and commit turns until the size target. */
export function body(session: Session, rand: () => number): Work {
	const work = new Work(session, rand);
	session.user(
		"I'm picking up tiny-cart again. Orient yourself: layout, what the config says, and what is on the release checklist."
	);
	const sources = ["money", ...MODULES.map((m) => m.name)]
		.map((n) => `${n}.js`)
		.join("\n");
	const tests = MODULES.map((m) => `${m.name}.test.js`).join("\n");
	work.bash(
		"ls && ls src test",
		"List the project",
		`README.md\nconfig.json\nnotes.txt\npackage.json\nsrc\ntest\nsrc:\n${sources}\ntest:\n${tests}`
	);
	for (const path of [
		"package.json",
		"README.md",
		"config.json",
		"notes.txt"
	]) {
		work.read(path);
	}
	session.reply(
		"tiny-cart is a cart-pricing library: one module per concern in src/ with a matching test file in test/. config.json sets the demo server to port 8080 on 127.0.0.1 and the README agrees. notes.txt is the 0.2.0 release checklist with one open TODO about the changelog."
	);
	let i = 0;
	const kinds: readonly TurnKind[] = [
		"tweak",
		"helper",
		"investigate",
		"tweak",
		"helper",
		"git"
	];
	while (session.contextTokens < BODY_TOKENS) {
		turn(work, kinds[i % kinds.length] ?? "tweak");
		i += 1;
	}
	return work;
}
