// Fakes and helpers that the tests of `claudetto-decide` (`adapters/cli.ts`) share.

import { expect, spyOn } from "bun:test";
import { mkdtemp, rm, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EXIT,
  main,
  type ReadOptions,
} from "../../../../plugins/claudetto/slices/decide/adapters/cli.ts";

export const KEY = "test-key-not-real";

/** A fake reply of the API with `status` and a JSON or text body. */
export const reply = (status: number, body: unknown = {}): Response =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });

/** A fake `fetch` that gives the replies in order, and records the count of calls. */
export const replies = (...list: Response[]) => {
  const calls = { count: 0 };
  const fetchFn = (async () => {
    const next = list[calls.count++];
    if (!next) throw new Error("no more replies in the fake");
    return next;
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
};

/** A fake `sleep` that records each wait in milliseconds. */
export const waits = () => {
  const ms: number[] = [];
  const sleep = async (n: number) => {
    ms.push(n);
  };
  return { ms, sleep };
};

export const BODY = { state: "", model: "jev-latest", questions: {} };

/** A fake image file with a content type. */
export const image = (type: string, byte: number): Blob =>
  new Blob([new Uint8Array([byte])], { type });

/** Stubs stdin with one `noul` question for `ask`. The caller restores the spy. */
export const stubAskStdin = () =>
  spyOn(Bun.stdin, "text").mockResolvedValue(
    JSON.stringify({ questions: { q: { type: "noul", instructions: "Ok?" } } }),
  );

/** Runs `main` with a fake `fetch` that records the init of each call, and a key in the environment. */
export const runMain = async (
  argv: string[],
  answers: unknown = {
    q: {
      noul: 0.9,
      choice: "x",
      confidence: 0.8,
      probabilities: { x: 0.8 },
    },
  },
  // No scaler, so that a test never runs `sips` unless it asks to.
  options: ReadOptions = { scale: null },
) => {
  const saved = process.env["TYPESAFE_API_KEY"];
  process.env["TYPESAFE_API_KEY"] = KEY;
  const seen: RequestInit[] = [];
  const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    _url: string,
    init: RequestInit,
  ) => {
    seen.push(init);
    return reply(200, { answers });
  }) as unknown as typeof fetch);
  const logSpy = spyOn(console, "log").mockImplementation(() => {});
  const errSpy = spyOn(console, "error").mockImplementation(() => {});
  try {
    const code = await main(argv, options);
    return {
      code,
      seen,
      out: logSpy.mock.calls.flat(),
      err: errSpy.mock.calls.flat().map(String),
    };
  } finally {
    fetchSpy.mockRestore();
    logSpy.mockRestore();
    errSpy.mockRestore();
    if (saved === undefined) delete process.env["TYPESAFE_API_KEY"];
    else process.env["TYPESAFE_API_KEY"] = saved;
  }
};

/** The first bytes of a PNG file and of a JPEG file, with a little more. */
export const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0,
]);

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]);

/** Runs `main` with one image file, and gives the code, the messages, and the requests. */
export const runBad = async (
  name: string,
  bytes: Uint8Array | null,
  size?: number,
  options?: ReadOptions,
) => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  try {
    const path = join(dir, name);
    if (bytes) await Bun.write(path, bytes);
    if (size !== undefined) {
      await truncate(path, size);
    }
    const { code, seen, err } = await runMain(
      ["yes", "--image", path, "--", "Q?"],
      undefined,
      options,
    );
    return { code, seen, text: err.join("\n"), path };
  } finally {
    await rm(dir, { recursive: true });
  }
};

/** Expects a run that exited 2 with no request, and with the size `w`x`h` in the message. */
export const expectStopped = (
  r: { code: number; seen: unknown[]; text: string },
  w: number,
  h: number,
) => {
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain(`${w}x${h}`);
};

export const BOX_ANSWER = {
  type: "box",
  box: { top: 0.1, bottom: 0.5, left: 0.25, right: 0.75 },
  confidence: 0.9,
};

/** A PNG header: the signature, then `IHDR` with the width and the height, big-endian. */
export const pngOf = (w: number, h: number): Uint8Array => {
  const bytes = new Uint8Array(33);
  bytes.set(PNG.slice(0, 8));
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, w);
  view.setUint32(20, h);
  return bytes;
};

export const yes = (path: string) => ["yes", "--image", path, "--", "Q?"];
