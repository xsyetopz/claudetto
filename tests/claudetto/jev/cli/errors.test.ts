// The failures of `main` in `adapters/cli.ts`: each fault of the arguments exits with the usage code and prints the usage, and each reply of the API gives its own exit code.
// The API is a fake `fetch`, so no test sends a request.

import { afterEach, expect, spyOn, test } from "bun:test";
import { stdin as bunStdin } from "bun";
import {
	EXIT,
	main,
} from "../../../../plugins/claudetto/modules/jev/adapters/cli.ts";
import { USAGE } from "../../../../plugins/claudetto/modules/jev/prompts.ts";
import { KEY, reply, runMain } from "./support.ts";

/** The end of a text that has one `"\n"` and no more. */
const ONE_NEWLINE_END = /[^\n]\n$/;

afterEach(() => {
	delete process.env["TYPESAFE_API_KEY"];
});

/** Runs `main` with the stdin text, and gives the exit code, the stderr text, and the count of requests. */
const runWithStdin = async (argv: string[], stdin: string) => {
	const stdinSpy = spyOn(bunStdin, "text").mockResolvedValue(stdin);
	try {
		const { code, seen, err } = await runMain(argv);
		return { code, count: seen.length, text: err.join("\n") };
	} finally {
		stdinSpy.mockRestore();
	}
};

const USAGE_FAULTS: [string, string[], string][] = [
	["an unknown verb", ["frobnicate"], ""],
	["no verb", [], ""],
	["`ask` with `--json`", ["ask", "--json"], "{}"],
	["`ask` with stdin that is not JSON", ["ask"], "not json"],
	["`ask` with no `questions`", ["ask"], "{}"],
	["`yes` with no question", ["yes"], ""],
	["`box` with no image", ["box", "--", "the button"], ""],
	["`--image` with no path", ["yes", "--image"], ""],
];

for (const [name, argv, stdin] of USAGE_FAULTS) {
	test(`${name} exits with the usage code, prints \`USAGE\`, and sends no request`, async () => {
		const run = await runWithStdin(argv, stdin);

		expect(run.code).toBe(EXIT.usage);
		expect(run.text).toContain(USAGE);
		expect(run.count).toBe(0);
	});
}

test("a `pick` with one option exits with the usage code and sends no request", async () => {
	const run = await runWithStdin(["pick", "--", "Which?", "a"], "");

	expect(run.code).toBe(EXIT.usage);
	expect(run.count).toBe(0);
});

/** Runs `main` with a fake `fetch` that gives one reply, and gives the exit code and the stderr text. */
const runWithReply = async (res: Response) => {
	process.env["TYPESAFE_API_KEY"] = KEY;
	const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(res);
	const logSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
	const errSpy = spyOn(console, "error").mockImplementation(() => undefined);
	try {
		const code = await main(["yes", "--", "Q?"]);
		return {
			code,
			out: logSpy.mock.calls.map(([s]) => String(s).trimEnd()),
			err: errSpy.mock.calls.flat().map(String).join("\n"),
		};
	} finally {
		fetchSpy.mockRestore();
		logSpy.mockRestore();
		errSpy.mockRestore();
	}
};

test("`main` exits with the code of the reply: 0 for success, 3 for a 401, 4 for a 402, and 1 for a 500", async () => {
	const ok = await runWithReply(reply(200, { answers: { q: { noul: 0.9 } } }));
	const key = await runWithReply(reply(401, "bad key"));
	const balance = await runWithReply(reply(402, "no balance"));
	const server = await runWithReply(reply(500, "boom"));

	expect(ok.code).toBe(EXIT.ok);
	expect(ok.out).toHaveLength(1);
	expect(key.code).toBe(EXIT.invalidKey);
	expect(balance.code).toBe(EXIT.noBalance);
	expect(server.code).toBe(EXIT.failed);
	for (const run of [key, balance, server]) {
		expect(run.out).toEqual([]);
		expect(run.err).not.toContain(KEY);
	}
});

test("`main` exits with 1 and prints nothing on stdout when the reply has no answer", async () => {
	const run = await runWithReply(reply(200, { answers: {} }));

	expect(run.code).toBe(EXIT.failed);
	expect(run.out).toEqual([]);
});

test("`main` with `--json` prints one JSON line with the text and the answer", async () => {
	process.env["TYPESAFE_API_KEY"] = KEY;
	const answers = { q: { noul: 0.9 } };
	const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
		reply(200, { answers }),
	);
	const logSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
	try {
		const code = await main(["yes", "--json", "--", "Q?"]);

		expect(code).toBe(EXIT.ok);
		expect(logSpy.mock.calls).toHaveLength(1);
		const written = String(logSpy.mock.calls[0]?.[0]);
		expect(written).toMatch(ONE_NEWLINE_END);
		const printed = JSON.parse(written);
		expect(printed.answer).toEqual({ choice: "yes", confidence: 0.9 });
		expect(typeof printed.text).toBe("string");
	} finally {
		fetchSpy.mockRestore();
		logSpy.mockRestore();
	}
});
