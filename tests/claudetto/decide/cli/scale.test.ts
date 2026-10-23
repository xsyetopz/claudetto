// The command `claudetto-decide` (`adapters/cli.ts`): scaling of images with a scaler.
// The API is a fake `fetch`, and the waits are a fake `sleep`, so no test sends a request or waits.

import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import {
  EXIT,
  imageSize,
  parseArgs,
  type ReadOptions,
  UsageError,
} from "../../../../plugins/claudetto/slices/decide/adapters/cli.ts";
import {
  BOX_ANSWER,
  expectStopped,
  PNG,
  pngOf,
  runBad,
  runMain,
  yes,
} from "./support.ts";

/** A fake scaler that writes a PNG of a size, and records the paths that it got. */
const fakeScaler = (w: number, h: number, ok = true) => {
  const calls: string[][] = [];
  const scale = async (input: string, output: string) => {
    calls.push([input, output]);
    if (ok) await Bun.write(output, pngOf(w, h));
    return ok;
  };
  return { scale, calls };
};

/** Runs `main` on a PNG header of a size with `options`, and gives the result and the original bytes after the run. */
const runScaled = async (
  argv: (path: string) => string[],
  original: Uint8Array,
  options: ReadOptions,
  answers?: unknown,
) => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  try {
    const path = join(dir, "big.png");
    await Bun.write(path, original);
    const r = await runMain(argv(path), answers, options);
    return { ...r, path, after: await Bun.file(path).bytes() };
  } finally {
    await rm(dir, { recursive: true });
  }
};

const BIG = pngOf(1554, 2000);

/** A real PNG of a size: grey RGB pixels, with the CRC of each chunk. */
const realPng = (w: number, h: number): Uint8Array => {
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    view.setUint32(
      8 + data.length,
      Bun.hash.crc32(out.subarray(4, 8 + data.length)),
    );
    return out;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, w);
  v.setUint32(4, h);
  ihdr.set([8, 2, 0, 0, 0], 8);
  // Each row is a filter byte `0`, then `w` RGB pixels.
  const rows = new Uint8Array(h * (1 + w * 3)).fill(128);
  for (let y = 0; y < h; y++) rows[y * (1 + w * 3)] = 0;
  return Buffer.concat([
    PNG.subarray(0, 8),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", new Uint8Array()),
  ]);
};

test("`main` scales an image over the side maximum into a copy, sends the copy, and prints one info line", async () => {
  const { scale, calls } = fakeScaler(1218, 1568);
  const r = await runScaled(yes, BIG, { scale });
  expect(r.code).toBe(EXIT.ok);
  expect(r.seen).toHaveLength(1);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.[0]).toBe(r.path);
  expect(calls[0]?.[1]).not.toBe(r.path);
  expect(r.err).toEqual([
    `Scaled \`${r.path}\` from 1554x2000 to 1218x1568 px for the API.`,
  ]);
  expect(Buffer.from(r.after).equals(BIG)).toBe(true);
  const form = r.seen[0]?.body as FormData;
  const sent = new Uint8Array(await (form.get("img1") as File).arrayBuffer());
  expect(imageSize(sent)).toEqual({ width: 1218, height: 1568 });
});

test("`main` prints the pixels of a `box` from the size of the original file", async () => {
  const { scale } = fakeScaler(1218, 1568);
  const r = await runScaled(
    (path) => ["box", "--image", path, "--", "the button"],
    BIG,
    { scale },
    { q: BOX_ANSWER },
  );
  expect(r.code).toBe(EXIT.ok);
  expect(r.out[0]).toContain("of 1554x2000");
});

test("`main` with `--json` keeps stdout as JSON when it scaled", async () => {
  const { scale } = fakeScaler(1218, 1568);
  const r = await runScaled(
    (path) => ["yes", "--json", "--image", path, "--", "Q?"],
    BIG,
    { scale },
    { q: { noul: 0.9, confidence: 0.8, probabilities: { x: 0.8 } } },
  );
  expect(r.code).toBe(EXIT.ok);
  expect(() => JSON.parse(String(r.out[0]))).not.toThrow();
});

test("`main` with no scaler exits 2 with no request and a hint for `sips` and `magick`", async () => {
  const r = await runBad("big.png", BIG, undefined, { scale: null });
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain("sips -Z 1568 in.png --out out.png");
  expect(r.text).toContain("magick in.png -resize 1568x1568 out.png");
});

test("`main` exits 2 with no request when the scaler fails", async () => {
  const { scale, calls } = fakeScaler(1, 1, false);
  const r = await runBad("big.png", BIG, undefined, { scale });
  expect(calls).toHaveLength(1);
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain("1554x2000");
});

test("`main` exits 2 with no request when the copy is still out of bounds", async () => {
  for (const [w, h] of [
    [1600, 1600],
    [1568, 100],
  ] as const) {
    const { scale } = fakeScaler(w, h);
    expectStopped(await runBad("big.png", BIG, undefined, { scale }), w, h);
  }
});

test("`main` reports the real size of a file that is under the minimum and over the maximum, with no scaling", async () => {
  const { scale, calls } = fakeScaler(1568, 100);
  const r = await runBad("wide.png", pngOf(4000, 255), undefined, { scale });
  expect(calls).toHaveLength(0);
  expectStopped(r, 4000, 255);
  expect(r.text).toContain("under 280 px on a side");
});

test("`main` names the scaled copy, its size, and the original size when the copy is out of bounds", async () => {
  const { scale } = fakeScaler(1568, 100);
  const r = await runBad("wide.png", pngOf(4000, 2000), undefined, { scale });
  expectStopped(r, 1568, 100);
  expect(r.text).toContain("The scaled copy of the image file");
  expect(r.text).toContain("original is 4000x2000 px");
});

test("`main` prints one line for a scaler that fails, then the size error", async () => {
  const { scale } = fakeScaler(1, 1, false);
  const r = await runBad("big.png", BIG, undefined, { scale });
  expectStopped(r, 1554, 2000);
  expect(r.text).toContain(`The scale of \`${r.path}\` with \`sips\` failed.`);
});

test("`main` treats a scaler that writes no copy as a failed scaling, and does not say that the original is missing", async () => {
  const none = async () => true;
  const r = await runBad("big.png", BIG, undefined, { scale: none });
  expectStopped(r, 1554, 2000);
  expect(r.text).toContain("with `sips` failed.");
  expect(r.text).not.toContain("does not exist");
});

test("`main` prints an info line with the maximum when the header of the copy has no size", async () => {
  const scale = async (_in: string, out: string) => {
    await Bun.write(out, PNG);
    return true;
  };
  const r = await runScaled(yes, BIG, { scale });
  expect(r.code).toBe(EXIT.ok);
  expect(r.err).toEqual([
    `Scaled \`${r.path}\` from 1554x2000 to at most 1,568 px on a side for the API.`,
  ]);
});

test("`main` never scales an image up", async () => {
  const { scale, calls } = fakeScaler(300, 300);
  const r = await runBad("small.png", pngOf(100, 100), undefined, { scale });
  expect(calls).toHaveLength(0);
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
});

test("`main` does not call the scaler for an image inside the bounds", async () => {
  const { scale, calls } = fakeScaler(300, 300);
  const r = await runBad("ok.png", pngOf(1568, 1568), undefined, { scale });
  expect(calls).toHaveLength(0);
  expect(r.code).toBe(EXIT.ok);
});

test.skipIf(!Bun.which("sips"))(
  "`main` scales a real PNG with `sips` and sends a copy inside the bounds",
  async () => {
    const original = realPng(1554, 2000);
    const r = await runScaled(yes, original, {});
    expect(r.code).toBe(EXIT.ok);
    expect(r.seen).toHaveLength(1);
    expect(r.err[0]).toContain("from 1554x2000 to 1218x1568 px");
    expect(Buffer.from(r.after).equals(original)).toBe(true);
    const form = r.seen[0]?.body as FormData;
    const sent = new Uint8Array(await (form.get("img1") as File).arrayBuffer());
    expect(imageSize(sent)).toEqual({ width: 1218, height: 1568 });
  },
);

test("`main` exits 2 with no request for an `--image` path that is a directory", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  try {
    const { code, seen, err } = await runMain(
      ["yes", "--image", dir, "--", "Q?"],
      undefined,
    );
    expect(code).toBe(EXIT.usage);
    expect(seen).toHaveLength(0);
    expect(err.join("\n")).toBe(
      `The image file \`${dir}\` is a directory, not a file.`,
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("`ask` rejects `--state` and `--json` with a usage error, and sends no request", async () => {
  for (const flags of [["--state", "x"], ["--json"]]) {
    expect(() => parseArgs(["ask", ...flags])).toThrow(UsageError);
    const { code, seen, err } = await runMain(["ask", ...flags]);
    expect(code).toBe(EXIT.usage);
    expect(seen).toHaveLength(0);
    expect(err.join("\n")).toContain("takes no `--state` and no `--json`");
  }
});
