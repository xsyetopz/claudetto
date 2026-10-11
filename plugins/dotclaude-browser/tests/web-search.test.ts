// The hook lab of dotclaude-browser: `claude plugin test plugins/dotclaude-browser` loads the hooks module,
// fires `tool.call` events for `WebSearch`, and stubs each answer of Claude Code.
// No browser runs, no session starts, and no network call goes out.
// The `process.run` stub is the test's own, so the live engine and the live browser are not tested.

import type { On, ProcessRunResult } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

type Run = Pick<ProcessRunResult, "exitCode" | "stdout" | "stderr">;

/** A finished run: the three fields of `Run`, and no cut output. */
const done = (run: Run): ProcessRunResult => ({
  ...run,
  isStdoutTruncated: false,
  isStderrTruncated: false,
});
type SearchInput = {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
};

const PAGE = "Bun v1.3.0 release notes\nhttps://bun.sh/blog/bun-v1.3";

/** Stubs `process.run`: `answer` gives the run for each argument vector. */
function stub(
  on: On,
  answer?: (argv: readonly string[]) => Run,
  builds: readonly string[] = [],
  listError?: string,
  folder = true,
) {
  const runs: (readonly string[])[] = [];
  mock.env(on, { HOME: "/home/me" });
  on("fs.list", () => {
    if (listError)
      throw Object.assign(new Error("list failed"), { code: listError });
    return {
      value: builds.map((name) => ({
        name,
        kind: "dir",
        size: 0,
        mtimeMs: 0,
        isLink: false,
      })),
    };
  });
  on("fs.exists", (_$, e) => ({
    value: folder || !String(e.path).endsWith(".cloakbrowser"),
  }));
  on("process.run", (_$, e) => {
    runs.push(e.argv);
    return {
      value: done(
        answer?.(e.argv) ?? {
          exitCode: 0,
          stdout: e.argv.includes("get") ? PAGE : "",
          stderr: "",
        },
      ),
    };
  });
  return runs;
}

const search = (
  $: Engine,
  input: SearchInput = { query: "bun latest release" },
) => $.tool.call({ tool: "WebSearch", mode: "standard", ...input });

/** The result of a search that the tool answered: a deny or an error fails the test. */
function answered(out: Awaited<ReturnType<typeof search>>) {
  if (out.deny !== undefined || out.isError) {
    throw new Error(`the search gave no result: ${out.deny ?? out.text}`);
  }
  return out.result;
}

const BUILT_IN = "from the built-in WebSearch";

/** Stubs the built-in `WebSearch`, which answers when the hook calls `next`. */
function builtIn(on: On) {
  on("tool.call", (_$, e, next) =>
    e.tool === "WebSearch"
      ? { result: { query: e.query, results: [BUILT_IN], durationSeconds: 0 } }
      : next(e),
  );
}

test("with the add-on, the result comes from the headless browser", async ($: Engine, on: On) => {
  const runs = stub(on);
  const out = await search($);
  expect(answered(out).query).toBe("bun latest release");
  expect(answered(out).results[0]).toContain("Bun v1.3.0 release notes");
  expect(
    runs.map((r) => r.find((a) => ["open", "get", "close"].includes(a))),
  ).toEqual(["open", "get", "close"]);
  expect(runs[0]?.[0]).toBe("agent-browser");
  expect(runs[0]?.at(-1)).toBe(
    "https://html.duckduckgo.com/html/?q=bun%20latest%20release",
  );
});

test("parallel searches use own sessions, and each closes only its own", async ($: Engine, on: On) => {
  const runs = stub(on);
  await Promise.all([search($, { query: "one" }), search($, { query: "two" })]);
  const sessionOf = (r: readonly string[]) => r[r.indexOf("--session") + 1];
  const sessions = new Set(runs.map(sessionOf));
  expect(sessions.size).toBe(2);
  for (const s of sessions)
    expect(
      runs
        .filter((r) => sessionOf(r) === s)
        .map((r) => r.find((a) => ["open", "get", "close"].includes(a))),
    ).toEqual(["open", "get", "close"]);
});

test("when the read gives no text with exit 0, the built-in `WebSearch` answers", async ($: Engine, on: On) => {
  stub(on, () => ({ exitCode: 0, stdout: "", stderr: "" }));
  builtIn(on);
  const out = await search($);
  expect(answered(out).results).toEqual([BUILT_IN]);
});

test("the domain filters become search terms", async ($: Engine, on: On) => {
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

test("when the browser fails, the built-in `WebSearch` answers and the session closes", async ($: Engine, on: On) => {
  const runs = stub(on, (argv) =>
    argv.includes("open")
      ? { exitCode: 1, stdout: "", stderr: "no Chrome found" }
      : { exitCode: 0, stdout: "", stderr: "" },
  );
  builtIn(on);
  const out = await search($);
  expect(answered(out).results).toEqual([BUILT_IN]);
  expect(runs.some((r) => r.includes("close"))).toBe(true);
  expect(runs.some((r) => r.includes("get"))).toBe(false);
});

test("after a bot check page, the built-in `WebSearch` answers", async ($: Engine, on: On) => {
  stub(on, (argv) => ({
    exitCode: 0,
    stdout: argv.includes("get")
      ? "Unfortunately, bots use DuckDuckGo too."
      : "",
    stderr: "",
  }));
  builtIn(on);
  const out = await search($);
  expect(answered(out).results).toEqual([BUILT_IN]);
});

test("after a page with no text, the built-in `WebSearch` answers", async ($: Engine, on: On) => {
  stub(on, () => ({ exitCode: 0, stdout: "  \n", stderr: "" }));
  builtIn(on);
  const out = await search($);
  expect(answered(out).results).toEqual([BUILT_IN]);
});

test("when the browser throws, the built-in `WebSearch` answers", async ($: Engine, on: On) => {
  stub(on, () => {
    throw new Error("spawn failed");
  });
  builtIn(on);
  const out = await search($);
  expect(answered(out).results).toEqual([BUILT_IN]);
});

test("when the folder of builds is absent, the search uses plain `agent-browser`", async ($: Engine, on: On) => {
  const runs = stub(on, undefined, BUILDS, undefined, false);
  const out = await search($);
  expect(runs).toHaveLength(3);
  for (const r of runs) expect(r).not.toContain("--executable-path");
  expect(answered(out).results[0]).toContain("`agent-browser`");
});

test("when the folder of builds fails to read for a reason other than a missing folder, no browser starts and the built-in `WebSearch` answers", async ($: Engine, on: On) => {
  const runs = stub(on, undefined, [], "unreadable");
  builtIn(on);
  const out = await search($);
  expect(runs).toHaveLength(0);
  expect(answered(out).results).toEqual([BUILT_IN]);
});

test("an empty query is denied and starts no browser", async ($: Engine, on: On) => {
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
const exeOf = (r: readonly string[] | undefined) =>
  r?.[r.indexOf("--executable-path") + 1];

test("with CloakBrowser builds present, the search uses the newest binary", async ($: Engine, on: On) => {
  const runs = stub(on, undefined, BUILDS);
  const out = await search($);
  expect(runs).toHaveLength(3);
  for (const r of runs) expect(exeOf(r)).toBe(BIN("10.2.0"));
  expect(answered(out).results[0]).toContain("CloakBrowser");
});

test("with no CloakBrowser binary, the search uses plain `agent-browser`", async ($: Engine, on: On) => {
  const runs = stub(on);
  const out = await search($);
  for (const r of runs) expect(r).not.toContain("--executable-path");
  expect(answered(out).results[0]).toContain("`agent-browser`");
});

test("after a bot check of CloakBrowser, the built-in `WebSearch` answers", async ($: Engine, on: On) => {
  const runs = stub(
    on,
    (argv) => ({
      exitCode: 0,
      stdout: argv.includes("get") ? "bots use DuckDuckGo too" : "",
      stderr: "",
    }),
    BUILDS,
  );
  builtIn(on);
  const out = await search($);
  expect(exeOf(runs[0])).toBe(BIN("10.2.0"));
  expect(answered(out).results).toEqual([BUILT_IN]);
  expect(out.context).toBeUndefined();
});

test(
  "with the `cloakbrowser` backend, a bot check gives the built-in result and a notice with the reason",
  { options: { backend: "cloakbrowser" } },
  async ($: Engine, on: On) => {
    stub(
      on,
      (argv) => ({
        exitCode: 0,
        stdout: argv.includes("get") ? "bots use DuckDuckGo too" : "",
        stderr: "",
      }),
      BUILDS,
    );
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
    expect(out.context).toHaveLength(1);
    expect(out.context?.[0]).toContain("asked CloakBrowser for a bot check");
    expect(out.context?.[0]).toContain("built-in `WebSearch`");
  },
);

test(
  "with the `cloakbrowser` backend and no binary, the call is denied and no browser starts",
  { options: { backend: "cloakbrowser" } },
  async ($: Engine, on: On) => {
    const runs = stub(on);
    const out = await search($);
    expect(typeof out.deny).toBe("string");
    expect(runs).toHaveLength(0);
  },
);

test(
  "with the `cloakbrowser` backend and a binary, the search uses CloakBrowser",
  { options: { backend: "cloakbrowser" } },
  async ($: Engine, on: On) => {
    const runs = stub(on, undefined, BUILDS);
    const out = await search($);
    expect(exeOf(runs[0])).toBe(BIN("10.2.0"));
    expect(answered(out).results[0]).toContain("CloakBrowser");
  },
);

test(
  "with the `cloakbrowser` backend, a browser that throws gives the built-in result and a notice with the failure",
  { options: { backend: "cloakbrowser" } },
  async ($: Engine, on: On) => {
    stub(
      on,
      () => {
        throw new Error("spawn failed");
      },
      BUILDS,
    );
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
    expect(out.context?.[0]).toContain("The search failed:");
  },
);

test("a call of another tool is not touched", async ($: Engine, on: On) => {
  const runs = stub(on);
  on("tool.call", (_$, e, next) =>
    e.tool === "Read" ? { result: "from core" } : next(e),
  );
  const out = await $.tool.call({ tool: "Read", file_path: "a.md" });
  expect(out.result).toBe("from core");
  expect(runs).toHaveLength(0);
});
