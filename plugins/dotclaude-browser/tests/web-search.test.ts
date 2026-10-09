// The hook lab of dotclaude-browser: `claude plugin test plugins/dotclaude-browser` loads the hooks module,
// fires `tool.call` events for `WebSearch`, and stubs each answer of Claude Code.
// No browser runs, no session starts, and no network call goes out.
// The `process.run` stub is the test's own, so the live engine and the live browser are not tested.

import { expect, mock, test } from "claude-code/testing";

type Run = { exitCode: number; stdout: string; stderr: string };

const PAGE = "Bun v1.3.0 release notes\nhttps://bun.sh/blog/bun-v1.3";

/** Stubs `process.run`: `answer` gives the run for each argument vector. */
function stub(
  on: any,
  answer?: (argv: string[]) => Run,
  builds: string[] = [],
) {
  const runs: string[][] = [];
  mock.env(on, { HOME: "/home/me" });
  on("fs.list", () => ({
    value: builds.map((name) => ({
      name,
      kind: "dir",
      size: 0,
      mtimeMs: 0,
      isLink: false,
    })),
  }));
  on("fs.exists", () => ({ value: true }));
  on("process.run", (_$: any, e: any) => {
    runs.push(e.argv);
    return {
      value: answer?.(e.argv) ?? {
        exitCode: 0,
        stdout: e.argv.includes("get") ? PAGE : "",
        stderr: "",
      },
    };
  });
  return runs;
}

const search = ($: any, input: object = { query: "bun latest release" }) =>
  $.tool.call({ tool: "WebSearch", mode: "standard", ...input });

test("with the add-on, the result comes from the headless browser", async ($: any, on: any) => {
  const runs = stub(on);
  const out = await search($);
  expect(out.result.query).toBe("bun latest release");
  expect(out.result.results[0]).toContain("Bun v1.3.0 release notes");
  expect(
    runs.map((r) => r.find((a) => ["open", "get", "close"].includes(a))),
  ).toEqual(["open", "get", "close"]);
  expect(runs[0]?.[0]).toBe("agent-browser");
  expect(runs[0]?.at(-1)).toBe(
    "https://html.duckduckgo.com/html/?q=bun%20latest%20release",
  );
});

test("parallel searches use own sessions, and each closes only its own", async ($: any, on: any) => {
  const runs = stub(on);
  await Promise.all([search($, { query: "one" }), search($, { query: "two" })]);
  const sessionOf = (r: string[]) => r[r.indexOf("--session") + 1];
  const sessions = new Set(runs.map(sessionOf));
  expect(sessions.size).toBe(2);
  for (const s of sessions)
    expect(
      runs
        .filter((r) => sessionOf(r) === s)
        .map((r) => r.find((a) => ["open", "get", "close"].includes(a))),
    ).toEqual(["open", "get", "close"]);
});

test("when the read gives no text with exit 0, the call is denied with no `undefined` in the text", async ($: any, on: any) => {
  stub(on, () => ({ exitCode: 0, stdout: "", stderr: "" }));
  const out = await search($);
  expect(out.deny).not.toContain("undefined");
  expect(typeof out.deny).toBe("string");
});

test("the domain filters become search terms", async ($: any, on: any) => {
  const runs = stub(on);
  await search($, {
    query: "bun",
    allowed_domains: ["bun.sh"],
    blocked_domains: ["example.com", "a b; rm"],
  });
  expect(decodeURIComponent(runs[0]?.at(-1) ?? "")).toContain(
    "q=bun site:bun.sh -site:example.com",
  );
  expect(runs[0]?.at(-1)).not.toContain("rm");
});

test("when the browser fails, the call is denied with the error of the browser", async ($: any, on: any) => {
  const runs = stub(on, (argv) =>
    argv.includes("open")
      ? { exitCode: 1, stdout: "", stderr: "no Chrome found" }
      : { exitCode: 0, stdout: "", stderr: "" },
  );
  const out = await search($);
  expect(out.deny).toContain("no Chrome found");
  expect(runs.some((r) => r.includes("close"))).toBe(true);
  expect(runs.some((r) => r.includes("get"))).toBe(false);
});

test("a bot check page is denied", async ($: any, on: any) => {
  stub(on, (argv) => ({
    exitCode: 0,
    stdout: argv.includes("get")
      ? "Unfortunately, bots use DuckDuckGo too."
      : "",
    stderr: "",
  }));
  const out = await search($);
  expect(typeof out.deny).toBe("string");
});

test("a page with no text is denied", async ($: any, on: any) => {
  stub(on, () => ({ exitCode: 0, stdout: "  \n", stderr: "" }));
  const out = await search($);
  expect(typeof out.deny).toBe("string");
});

test("an empty query is denied and starts no browser", async ($: any, on: any) => {
  const runs = stub(on);
  const out = await search($, { query: "  " });
  expect(typeof out.deny).toBe("string");
  expect(runs).toHaveLength(0);
});

const BIN = (v: string) =>
  `/home/me/.cloakbrowser/chromium-${v}/Chromium.app/Contents/MacOS/Chromium`;
const BUILDS = [
  "chromium-9.1.0",
  "chromium-10.2.0",
  "notes",
  "chromium-10.1.5",
];
const exeOf = (r: string[] | undefined) =>
  r?.[r.indexOf("--executable-path") + 1];

test("with CloakBrowser builds present, the search uses the newest binary", async ($: any, on: any) => {
  const runs = stub(on, undefined, BUILDS);
  const out = await search($);
  expect(runs).toHaveLength(3);
  for (const r of runs) expect(exeOf(r)).toBe(BIN("10.2.0"));
  expect(out.result.results[0]).toContain("CloakBrowser");
});

test("with no CloakBrowser binary, the search uses plain `agent-browser`", async ($: any, on: any) => {
  const runs = stub(on);
  const out = await search($);
  for (const r of runs) expect(r).not.toContain("--executable-path");
  expect(out.result.results[0]).toContain("`agent-browser`");
});

test("a bot check names the browser that got it", async ($: any, on: any) => {
  stub(
    on,
    (argv) => ({
      exitCode: 0,
      stdout: argv.includes("get") ? "bots use DuckDuckGo too" : "",
      stderr: "",
    }),
    BUILDS,
  );
  const out = await search($);
  expect(out.deny).toContain("asked CloakBrowser for a bot check");
});

test(
  "with the `cloakbrowser` backend and no binary, the call is denied and no browser starts",
  { options: { backend: "cloakbrowser" } },
  async ($: any, on: any) => {
    const runs = stub(on);
    const out = await search($);
    expect(out.deny).toContain("CloakBrowser binary is missing");
    expect(out.deny).toContain("install CloakBrowser");
    expect(runs).toHaveLength(0);
  },
);

test(
  "with the `cloakbrowser` backend and a binary, the search uses CloakBrowser",
  { options: { backend: "cloakbrowser" } },
  async ($: any, on: any) => {
    const runs = stub(on, undefined, BUILDS);
    const out = await search($);
    expect(exeOf(runs[0])).toBe(BIN("10.2.0"));
    expect(out.result.results[0]).toContain("CloakBrowser");
  },
);

test("a call of another tool is not touched", async ($: any, on: any) => {
  const runs = stub(on);
  on("tool.call", (_$: any, e: any) =>
    e.tool === "Read" ? { result: "from core" } : undefined,
  );
  const out = await $.tool.call({ tool: "Read", file_path: "a.md" });
  expect(out.result).toBe("from core");
  expect(runs).toHaveLength(0);
});
