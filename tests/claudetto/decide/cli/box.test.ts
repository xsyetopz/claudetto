// The command `claudetto-decide` (`adapters/cli.ts`): `box`, `imageSize`, and the pixel bounds.
// The API is a fake `fetch`, and the waits are a fake `sleep`, so no test sends a request or waits.

import { expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildBody,
  EXIT,
  imageSize,
  parseArgs,
  render,
} from "../../../../plugins/claudetto/slices/decide/adapters/cli.ts";
import {
  IMAGE_PIXELS_MAX,
  IMAGE_PIXELS_MIN,
  IMAGE_SIDE_MAX,
  IMAGE_SIDE_MIN,
} from "../../../../plugins/claudetto/slices/decide/limits.ts";
import {
  BOX_ANSWER,
  expectStopped,
  JPEG,
  PNG,
  pngOf,
  runBad,
  runMain,
  stubAskStdin,
} from "./support.ts";

/** A JPEG with an `APP0` segment before the `SOF0` segment, and the `SOF0` has the height, then the width. */
const jpegOf = (w: number, h: number): Uint8Array => {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0, 6, 1, 2, 3, 4, 0xff, 0xc0, 0, 11, 8, 0, 0, 0, 0,
    3,
  ]);
  const view = new DataView(bytes.buffer);
  view.setUint16(15, h);
  view.setUint16(17, w);
  return bytes;
};

/** A JPEG made of `parts` after the `SOI`, then a `SOF` segment with `marker`. */
const jpegWith = (parts: number[], marker = 0xc0): Uint8Array =>
  new Uint8Array([
    0xff,
    0xd8,
    ...parts,
    0xff,
    marker,
    0,
    11,
    8,
    0,
    20,
    0,
    30,
    3,
  ]);

test("a `box` body asks one `box` question with the instructions and no `criteria`", async () => {
  const args = parseArgs(["box", "--image", "a.png", "--", "the button"]);
  expect(await buildBody(args, async () => "")).toEqual({
    state: "",
    model: "jev-latest",
    questions: { q: { type: "box", instructions: "the button" } },
  });
});

test("`main` sends `box` with `jev-1.14.0` and the header", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  try {
    const a = join(dir, "a.png");
    await Bun.write(a, PNG);
    const { code, seen } = await runMain(
      ["box", "--image", a, "--", "the button"],
      { q: BOX_ANSWER },
    );
    expect(code).toBe(EXIT.ok);
    expect(seen[0]?.headers).toMatchObject({
      "TypeSafe-Danger-Zone-Images": "true",
    });
    const form = seen[0]?.body as FormData;
    const json = JSON.parse(await (form.get("request") as File).text());
    expect(json.model).toBe("jev-1.14.0");
    expect(json.questions).toEqual({
      q: { type: "box", instructions: "the button" },
    });
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("`main` sends `ask` with a `box` and another question with `jev-1.14.0`", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  const stdin = spyOn(Bun.stdin, "text").mockResolvedValue(
    JSON.stringify({
      questions: {
        p: { type: "noul", instructions: "Is it there?" },
        b: { type: "box", instructions: "the button" },
      },
    }),
  );
  try {
    const a = join(dir, "a.png");
    await Bun.write(a, PNG);
    const { code, seen } = await runMain(["ask", "--image", a], {});
    expect(code).toBe(EXIT.ok);
    const form = seen[0]?.body as FormData;
    const json = JSON.parse(await (form.get("request") as File).text());
    expect(json.model).toBe("jev-1.14.0");
    expect(seen[0]?.headers).toMatchObject({
      "TypeSafe-Danger-Zone-Images": "true",
    });
  } finally {
    stdin.mockRestore();
    await rm(dir, { recursive: true });
  }
});

test("`box` prints the four fractions and the `confidence` as text", () => {
  const text = render(parseArgs(["box", "--", "x"]), { q: BOX_ANSWER });
  expect(text).toBe(
    "top 0.10, bottom 0.50, left 0.25, right 0.75 (confidence 0.90)",
  );
});

test("`box --json` prints the raw answer", () => {
  const text = render(parseArgs(["box", "--json", "--", "x"]), {
    q: BOX_ANSWER,
  });
  expect(JSON.parse(text)).toEqual(BOX_ANSWER);
});

test("`box` reads the reply of `jev-1.14.0` as the API gave it", () => {
  const reply = JSON.parse(
    '{"q":{"type":"box","box":{"top":0.1,"bottom":0.51,"left":0.25,"right":0.76},"confidence":0.92}}',
  );
  expect(render(parseArgs(["box", "--", "x"]), reply)).toBe(
    "top 0.10, bottom 0.51, left 0.25, right 0.76 (confidence 0.92)",
  );
  expect(
    render(parseArgs(["box", "--", "x"]), reply, { width: 640, height: 480 }),
  ).toBe(
    "top 0.10, bottom 0.51, left 0.25, right 0.76 (confidence 0.92), px x 160..486 y 48..245 of 640x480",
  );
});

test("`box` fails on the flat shape", () => {
  const flat = {
    q: { top: 0.1, bottom: 0.5, left: 0.25, right: 0.75, confidence: 0.9 },
  };
  expect(() => render(parseArgs(["box", "--", "x"]), flat)).toThrow();
});

test("`box` fails on a reply with no box", () => {
  expect(() => render(parseArgs(["box", "--", "x"]), {})).toThrow();
});

test("`box` with no `--image` exits `2` and sends no request", async () => {
  const { code, seen } = await runMain(["box", "--", "the button"]);
  expect(code).toBe(EXIT.usage);
  expect(seen).toHaveLength(0);
});

test("`imageSize` reads the width and the height from the `IHDR` of a PNG", () => {
  expect(imageSize(pngOf(640, 480))).toEqual({ width: 640, height: 480 });
});

test("`imageSize` reads the `SOF0` of a JPEG after an `APP0` segment", () => {
  expect(imageSize(jpegOf(640, 480))).toEqual({ width: 640, height: 480 });
});

test("`imageSize` gives `undefined` for a truncated file or a JPEG with no `SOF`", () => {
  expect(imageSize(pngOf(640, 480).slice(0, 20))).toBeUndefined();
  expect(imageSize(jpegOf(640, 480).slice(0, 16))).toBeUndefined();
  expect(imageSize(JPEG)).toBeUndefined();
});

test("`imageSize` gives `undefined` for a PNG whose first chunk is not `IHDR`", () => {
  const bytes = pngOf(640, 480);
  bytes.set([0x49, 0x48, 0x44, 0x53], 12);
  expect(imageSize(bytes)).toBeUndefined();
});

test("`imageSize` gives `undefined` for a width or height of 0", () => {
  expect(imageSize(pngOf(0, 480))).toBeUndefined();
  expect(imageSize(pngOf(640, 0))).toBeUndefined();
  expect(imageSize(jpegOf(0, 480))).toBeUndefined();
  expect(imageSize(jpegOf(640, 0))).toBeUndefined();
});

test("`imageSize` walks past standalone markers, fill bytes, and `DHT`, and reads `SOF2`", () => {
  const want = { width: 30, height: 20 };
  expect(imageSize(jpegWith([0xff, 0xd0]))).toEqual(want);
  expect(imageSize(jpegWith([0xff, 0x01]))).toEqual(want);
  expect(imageSize(jpegWith([0xff, 0xff]))).toEqual(want);
  expect(imageSize(jpegWith([0xff, 0xc4, 0, 4, 0, 0]))).toEqual(want);
  expect(imageSize(jpegWith([], 0xc2))).toEqual(want);
});

test("`box` prints the box in pixels when the size is known", () => {
  const text = render(
    parseArgs(["box", "--", "x"]),
    { q: BOX_ANSWER },
    { width: 640, height: 480 },
  );
  expect(text).toBe(
    "top 0.10, bottom 0.50, left 0.25, right 0.75 (confidence 0.90), px x 160..480 y 48..240 of 640x480",
  );
});

test("`box --json` is the raw answer even when the size is known", () => {
  const text = render(
    parseArgs(["box", "--json", "--", "x"]),
    { q: BOX_ANSWER },
    { width: 640, height: 480 },
  );
  expect(JSON.parse(text)).toEqual(BOX_ANSWER);
});

test("`main` prints pixels for the first image, and none for a truncated file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  try {
    const a = join(dir, "a.png");
    const b = join(dir, "b.png");
    await Bun.write(a, pngOf(640, 480));
    await Bun.write(b, pngOf(640, 480).slice(0, 20));
    const full = await runMain(["box", "--image", a, "--", "x"], {
      q: BOX_ANSWER,
    });
    expect(full.out[0]).toContain("px x 160..480 y 48..240 of 640x480");
    const cut = await runMain(["box", "--image", b, "--", "x"], {
      q: BOX_ANSWER,
    });
    expect(cut.code).toBe(EXIT.ok);
    expect(cut.out[0]).toBe(
      "top 0.10, bottom 0.50, left 0.25, right 0.75 (confidence 0.90)",
    );
    const json = await runMain(["box", "--json", "--image", a, "--", "x"], {
      q: BOX_ANSWER,
    });
    expect(JSON.parse(json.out[0] as string)).toEqual(BOX_ANSWER);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("the pixel bounds of an image are pinned", () => {
  expect(IMAGE_SIDE_MIN).toBe(280);
  expect(IMAGE_SIDE_MAX).toBe(1568);
  expect(IMAGE_PIXELS_MIN).toBe(IMAGE_SIDE_MIN ** 2);
  expect(IMAGE_PIXELS_MAX).toBe(IMAGE_SIDE_MAX ** 2);
});

test("`main` exits 2 with no request for an image over the side maximum", async () => {
  const r = await runBad("tall.png", pngOf(1554, 2000));
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain(r.path);
});

test("`main` exits 2 with no request for a JPEG over the side maximum or under the side minimum", async () => {
  for (const [w, h] of [
    [1569, 400],
    [400, 279],
  ] as const) {
    expectStopped(await runBad("a.jpg", jpegOf(w, h)), w, h);
  }
});

test("`main` exits 2 with no request for an image under the side minimum", async () => {
  const r = await runBad("small.png", pngOf(279, 600));
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
});

test("`main` passes the inclusive edges of the pixel bounds", async () => {
  for (const [w, h] of [
    [1568, 1568],
    [280, 280],
    [1568, 280],
  ] as const) {
    const r = await runBad("edge.png", pngOf(w, h));
    expect(r.code).toBe(EXIT.ok);
    expect(r.seen).toHaveLength(1);
  }
});

test("`main` checks the pixel bounds for each verb that takes an image", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  const stdin = stubAskStdin();
  try {
    const a = join(dir, "a.png");
    await Bun.write(a, pngOf(1554, 2000));
    for (const argv of [
      ["yes", "--image", a, "--", "Q?"],
      ["pick", "--image", a, "--", "Which?", "x", "y"],
      ["box", "--image", a, "--", "the button"],
      ["ask", "--image", a],
    ]) {
      const { code, seen } = await runMain(argv);
      expect(code).toBe(EXIT.usage);
      expect(seen).toHaveLength(0);
    }
  } finally {
    stdin.mockRestore();
    await rm(dir, { recursive: true });
  }
});

test("`main` leaves an image with an unreadable size to the API", async () => {
  const r = await runBad("cut.png", pngOf(5000, 5000).slice(0, 20));
  expect(r.code).toBe(EXIT.ok);
  expect(r.seen).toHaveLength(1);
});

test("`main` leaves a JPEG with no `SOF` to the API", async () => {
  const r = await runBad("nosof.jpg", JPEG);
  expect(r.code).toBe(EXIT.ok);
  expect(r.seen).toHaveLength(1);
});
