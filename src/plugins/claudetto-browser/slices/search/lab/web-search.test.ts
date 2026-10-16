// The hook lab of claudetto-browser: `claude plugin test plugins/claudetto-browser` loads the hooks module,
// fires `tool.call` events for `WebSearch`, and stubs each answer of Claude Code.
// No browser runs, no session starts, and no network call goes out.
// The `process.run` stub is the test's own, so the live engine and the live browser are not tested.
// Each search test sets the `backend` option `cloakbrowser`, because only that backend searches.

import type {
  On,
  ProcessRunResult,
  ToolCallArgs,
  ToolNamed,
} from "claude-code";
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
  mode?: string;
  blocked_domains?: string[];
};

const PAGE = "Bun v1.4.3 release notes\nhttps://bun.com/blog/bun-v1.4.3";

const BIN = (v: string) =>
  // biome-ignore lint/plugin: a path in the fixture data
  `/home/me/.cloakbrowser/chromium-${v}/Chromium.app/Contents/MacOS/Chromium`;
const BUILDS = [
  "chromium-9.1.0",
  "chromium-10.2.0",
  "notes",
  "chromium-10.1.5",
];
const exeOf = (r: readonly string[] | undefined) =>
  r?.[r.indexOf("--executable-path") + 1];

/** The test options that select the `cloakbrowser` backend. */
const CLOAK = { options: { backend: "cloakbrowser" } };

/** Stubs `process.run`: `answer` gives the run for each argument vector. */
const stub = (
  on: On,
  answer?: (argv: readonly string[]) => Run,
  builds: readonly string[] = BUILDS,
  listError?: string,
  folder = true,
  verdict: "allow" | "ask" | "deny" = "allow",
) => {
  const runs: (readonly string[])[] = [];
  mock.env(on, { HOME: "/home/me" });
  on("tool.check", () => ({ decision: verdict }));
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
};

/**
 * The input of a `tool.call`.
 * Claude Code writes the tool types from the session that loads the plugin, and `mode` of `WebSearch` is in the types of some sessions only.
 * The assertion fits both, and the lab does not read `mode`.
 */
type CallInput = ToolCallArgs & ToolNamed<"WebSearch">;

const search = (
  $: Engine,
  input: SearchInput = { query: "bun latest release" },
) =>
  $.tool.call({ tool: "WebSearch", mode: "standard", ...input } as CallInput);

/** The result of a search that the tool answered: a deny or an error fails the test. */
const answered = (out: Awaited<ReturnType<typeof search>>) => {
  if (out.deny !== undefined || out.isError) {
    throw new Error(`the search gave no result: ${out.deny ?? out.text}`);
  }
  return out.result;
};

const BUILT_IN = "from the built-in WebSearch";

/** Stubs the built-in `WebSearch`, which answers when the hook calls `next`. */
const builtIn = (on: On) => {
  on("tool.call", (_$, e, next) =>
    e.tool === "WebSearch"
      ? { result: { query: e.query, results: [BUILT_IN], durationSeconds: 0 } }
      : next(e),
  );
};

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("with the default backend, a `WebSearch` call passes to the built-in tool and starts no browser", async ($: Engine, on: On) => {
  const runs = stub(on);
  builtIn(on);
  const out = await search($);
  expect(answered(out).results).toEqual([BUILT_IN]);
  expect(runs).toHaveLength(0);
});

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "with the `cloakbrowser` backend, the result comes from CloakBrowser",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on);
    const out = await search($);
    expect(answered(out).query).toBe("bun latest release");
    expect(answered(out).results[0]).toContain("Bun v1.4.3 release notes");
    expect(answered(out).results[0]).toContain("CloakBrowser");
    expect(
      runs.map((r) => r.find((a) => ["open", "get", "close"].includes(a))),
    ).toEqual(["open", "get", "close"]);
    expect(runs[0]?.[0]).toBe("agent-browser");
    for (const r of runs) expect(exeOf(r)).toBe(BIN("10.2.0"));
    expect(runs[0]?.at(-1)).toBe(
      "https://html.duckduckgo.com/html/?q=bun%20latest%20release",
    );
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "parallel searches use own sessions, and each closes only its own",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on);
    await Promise.all([
      search($, { query: "one" }),
      search($, { query: "two" }),
    ]);
    const sessionOf = (r: readonly string[]) => r[r.indexOf("--session") + 1];
    const sessions = new Set(runs.map(sessionOf));
    expect(sessions.size).toBe(2);
    for (const s of sessions)
      expect(
        runs
          .filter((r) => sessionOf(r) === s)
          .map((r) => r.find((a) => ["open", "get", "close"].includes(a))),
      ).toEqual(["open", "get", "close"]);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "when the read gives no text with exit 0, the built-in `WebSearch` answers",
  CLOAK,
  async ($: Engine, on: On) => {
    stub(on, () => ({ exitCode: 0, stdout: "", stderr: "" }));
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
  },
);

test(
  "the domain filters become search terms",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on);
    await search($, {
      query: "bun",
      allowed_domains: ["bun.com"],
      blocked_domains: ["example.com", "a b; rm"],
    });
    expect(decodeURIComponent(runs[0]?.at(-1) ?? "")).toContain(
      "q=bun site:bun.com -site:example.com",
    );
    expect(runs[0]?.at(-1)).not.toContain("rm");
  },
);

test(
  "the result is the text of the results element",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on);
    const out = await search($);
    expect(answered(out).results[0]).toContain(PAGE);
    expect(runs.some((r) => r.includes("#links"))).toBe(true);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "when the browser fails, the built-in `WebSearch` answers and the session closes",
  CLOAK,
  async ($: Engine, on: On) => {
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
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "when the page has no results element, as on a bot check, the built-in `WebSearch` answers with a notice of the reason",
  CLOAK,
  async ($: Engine, on: On) => {
    stub(on, (argv) =>
      argv.includes("#links")
        ? { exitCode: 1, stdout: "", stderr: "Element not found: #links" }
        : { exitCode: 0, stdout: "", stderr: "" },
    );
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
    expect(out.context).toHaveLength(1);
    expect(out.context?.[0]).toContain("#links");
    expect(out.context?.[0]).toContain("built-in `WebSearch`");
  },
);

test(
  "after a page with no text, the built-in `WebSearch` answers",
  CLOAK,
  async ($: Engine, on: On) => {
    stub(on, () => ({ exitCode: 0, stdout: "  \n", stderr: "" }));
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "when the browser throws, the built-in `WebSearch` answers with a notice",
  CLOAK,
  async ($: Engine, on: On) => {
    stub(on, () => {
      throw new Error("spawn failed");
    });
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
    expect(out.context?.[0]).toContain("The search failed");
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "with the `cloakbrowser` backend and no folder of builds, the call is denied and no browser starts",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on, undefined, BUILDS, undefined, false);
    const out = await search($);
    expect(typeof out.deny).toBe("string");
    expect(runs).toHaveLength(0);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "with the `cloakbrowser` backend and no binary, the call is denied and no browser starts",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on, undefined, []);
    const out = await search($);
    expect(typeof out.deny).toBe("string");
    expect(runs).toHaveLength(0);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "with the `cloakbrowser` backend, a folder of builds that fails to read for another reason than a missing folder starts no browser",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on, undefined, [], "unreadable");
    builtIn(on);
    const out = await search($);
    expect(runs).toHaveLength(0);
    expect(answered(out).results).toEqual([BUILT_IN]);
  },
);

test(
  "an empty query is denied and starts no browser",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on);
    const out = await search($, { query: "  " });
    expect(typeof out.deny).toBe("string");
    expect(runs).toHaveLength(0);
  },
);

test(
  "a call of another tool is not touched",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on);
    on("tool.call", (_$, e, next) =>
      e.tool === "Read" ? { result: "from core" } : next(e),
    );
    const out = await $.tool.call({ tool: "Read", file_path: "a.md" });
    expect(out.result).toBe("from core");
    expect(runs).toHaveLength(0);
  },
);

test(
  "a `WebSearch` deny rule makes no search",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on, undefined, BUILDS, undefined, true, "deny");
    on("tool.call", (_$, e, next) =>
      e.tool === "WebSearch" ? { deny: "denied by a rule" } : next(e),
    );
    const out = await search($);
    expect(out.deny).toBe("denied by a rule");
    expect(runs).toHaveLength(0);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "a `WebSearch` ask makes no search, and the built-in tool answers",
  CLOAK,
  async ($: Engine, on: On) => {
    const runs = stub(on, undefined, BUILDS, undefined, true, "ask");
    builtIn(on);
    const out = await search($);
    expect(answered(out).results).toEqual([BUILT_IN]);
    expect(runs).toHaveLength(0);
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "a dropped domain and the `extended` mode give notices in the result",
  CLOAK,
  async ($: Engine, on: On) => {
    stub(on);
    const out = await search($, {
      query: "bun",
      allowed_domains: ["bun.com", "a b; rm"],
      mode: "extended",
    } as SearchInput);
    const text = answered(out).results[0] ?? "";
    expect(text).toContain("`allowed_domains` filter did not apply");
    expect(text).toContain("a b; rm");
    expect(text).toContain("`extended` mode did not apply");
  },
);

test(
  // biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
  "a failed close goes to the log, and the next search uses a new session",
  CLOAK,
  async ($: Engine, on: On) => {
    const lines: string[] = [];
    on("ui.log", (_$, e) => {
      lines.push(String(e.text));
      return { value: undefined };
    });
    const runs = stub(on, (argv) =>
      argv.includes("close")
        ? { exitCode: 1, stdout: "", stderr: "no daemon" }
        : { exitCode: 0, stdout: argv.includes("get") ? PAGE : "", stderr: "" },
    );
    await search($);
    await search($);
    expect(lines.join("\n")).toContain("did not close");
    expect(lines.join("\n")).toContain("no daemon");
    const sessionOf = (r: readonly string[]) => r[r.indexOf("--session") + 1];
    expect(new Set(runs.map(sessionOf)).size).toBe(2);
  },
);
