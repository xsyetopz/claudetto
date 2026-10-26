// The command `claudetto-decide` (`adapters/cli.ts`): multipart requests, `main` with images, and the checks of the image files.
// The API is a fake `fetch`, and the waits are a fake `sleep`, so no test sends a request or waits.

import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildRequest,
  EXIT,
  parseArgs,
  post,
  UsageError,
} from "../../../../plugins/claudetto/modules/jev/adapters/cli.ts";
import { IMAGE_BYTES_MAX } from "../../../../plugins/claudetto/modules/jev/limits.ts";
import {
  image,
  JPEG,
  KEY,
  PNG,
  reply,
  runBad,
  runMain,
  stubAskStdin,
  waits,
} from "./support.ts";

const IMAGE_BODY = {
  state: "A screen.",
  model: "jev-latest",
  questions: { q: { type: "noul", instructions: "Is `img1` a login?" } },
};

const GIF = new TextEncoder().encode("GIF89a\u0001\u0000");

test("a request with an image has the header, and a first part `request` with `application/json`", async () => {
  const { body, headers } = buildRequest(IMAGE_BODY, [
    image("image/png", 1),
    image("image/jpeg", 2),
  ]);
  expect(headers["TypeSafe-Danger-Zone-Images"]).toBe("true");
  expect(body).toBeInstanceOf(FormData);
  const form = body as FormData;
  expect([...form.keys()]).toEqual(["request", "img1", "img2"]);
  const part = form.get("request") as File;
  expect(part.type).toContain("application/json");
  expect(JSON.parse(await part.text()).model).toBe("jev-latest");
});

test("an object state keeps its fields, and the images go in a field of it", async () => {
  const { body } = buildRequest({ ...IMAGE_BODY, state: { screen: "login" } }, [
    image("image/png", 1),
  ]);
  const json = JSON.parse(
    await ((body as FormData).get("request") as File).text(),
  );
  expect(json.state.screen).toBe("login");
  expect(JSON.stringify(json.state)).toContain(
    Object.keys(json.assets)[0] ?? "",
  );
});

test("each image has one file part `img<n>`, one `assets` entry, and one state line", async () => {
  const { body } = buildRequest(IMAGE_BODY, [
    image("image/png", 1),
    image("image/jpeg", 2),
  ]);
  const form = body as FormData;
  expect((form.get("img1") as File).type).toBe("image/png");
  expect((form.get("img2") as File).type).toBe("image/jpeg");
  const json = JSON.parse(await (form.get("request") as File).text());
  const ids = Object.keys(json.assets);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  expect(json.assets[ids[0] as string]).toEqual({
    type: "image",
    part: "img1",
  });
  expect(json.assets[ids[1] as string]).toEqual({
    type: "image",
    part: "img2",
  });
  expect(json.state).toContain("A screen.");
  expect(json.state).toContain(ids[0] as string);
  expect(json.state).toContain(ids[1] as string);
  expect(json.questions).toEqual(IMAGE_BODY.questions);
});

test("a request with no image and no `box` is the same JSON, with no header, and the model `jev-latest`", () => {
  const { body, headers } = buildRequest(IMAGE_BODY, []);
  expect(headers).toEqual({});
  expect(body).toBe(JSON.stringify(IMAGE_BODY));
  expect(JSON.parse(body as string).model).toBe("jev-latest");
});

test("a request with a `box` question has the header and the model `jev-1.14.0`", () => {
  const box = {
    ...IMAGE_BODY,
    questions: {
      q: { type: "noul", instructions: "x" },
      b: { type: "box", instructions: "the button" },
    },
  };
  const { body, headers } = buildRequest(box, []);
  expect(headers["TypeSafe-Danger-Zone-Images"]).toBe("true");
  expect(JSON.parse(body as string).model).toBe("jev-1.14.0");
});

test("`post` sends the multipart body and the header with `fetch`, and a text body with no header", async () => {
  const seen: RequestInit[] = [];
  const fetchFn = (async (_url: string, init: RequestInit) => {
    seen.push(init);
    return reply(200, { answers: 1 });
  }) as unknown as typeof fetch;
  await post(IMAGE_BODY, KEY, { fetchFn, images: [image("image/png", 1)] });
  await post(IMAGE_BODY, KEY, { fetchFn });
  const [withImage, text] = seen;
  expect(withImage?.body).toBeInstanceOf(FormData);
  expect(withImage?.headers).toMatchObject({
    "TypeSafe-Danger-Zone-Images": "true",
  });
  // `fetch` sets the content type with the boundary of the form.
  expect(JSON.stringify(withImage?.headers).toLowerCase()).not.toContain(
    "content-type",
  );
  expect(text?.body).toBe(JSON.stringify(IMAGE_BODY));
  expect(JSON.stringify(text?.headers)).not.toContain("Danger-Zone");
  expect(text?.headers).toMatchObject({ "content-type": "application/json" });
});

test("a 429 retry resends the same `FormData`, with the same image UUIDs", async () => {
  const bodies: unknown[] = [];
  const answers = [reply(429), reply(200, { answers: 1 })];
  const fetchFn = (async (_url: string, init: RequestInit) => {
    bodies.push(init.body);
    return answers.shift();
  }) as unknown as typeof fetch;
  const { sleep } = waits();
  await post(IMAGE_BODY, KEY, {
    fetchFn,
    sleep,
    images: [image("image/png", 1), image("image/jpeg", 2)],
  });
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  const form = bodies[1] as FormData;
  const json = JSON.parse(await (form.get("request") as File).text());
  expect(Object.keys(json.assets)).toHaveLength(2);
  expect([...form.keys()]).toEqual(["request", "img1", "img2"]);
});

test("a request with a `box` question and images is multipart, with `jev-1.14.0` in the `request` part", async () => {
  const box = {
    ...IMAGE_BODY,
    questions: { b: { type: "box", instructions: "the button" } },
  };
  const { body, headers } = buildRequest(box, [image("image/png", 1)]);
  expect(headers["TypeSafe-Danger-Zone-Images"]).toBe("true");
  expect(body).toBeInstanceOf(FormData);
  const json = JSON.parse(
    await ((body as FormData).get("request") as File).text(),
  );
  expect(json.model).toBe("jev-1.14.0");
});

test("`main` sends `yes` and `pick` with `--image` as multipart, one part for each path, with the content type of the first bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  try {
    const a = join(dir, "a.png");
    const b = join(dir, "b.jpg");
    await Bun.write(a, PNG);
    await Bun.write(b, JPEG);
    for (const argv of [
      ["yes", "--image", a, "--image", b, "--", "Safe?"],
      ["pick", "--image", a, "--image", b, "--", "Which?", "x", "y"],
    ]) {
      const { code, seen } = await runMain(argv);
      expect(code).toBe(EXIT.ok);
      const form = seen[0]?.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect([...form.keys()]).toEqual(["request", "img1", "img2"]);
      expect((form.get("img1") as File).type).toBe("image/png");
      expect((form.get("img2") as File).type).toBe("image/jpeg");
      expect(
        new Uint8Array(await (form.get("img1") as File).arrayBuffer()),
      ).toEqual(PNG);
      expect(seen[0]?.headers).toMatchObject({
        "TypeSafe-Danger-Zone-Images": "true",
      });
    }
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("`main` sends `ask` with `--image` as multipart, with the questions of stdin", async () => {
  const dir = await mkdtemp(join(tmpdir(), "decide-"));
  const stdin = stubAskStdin();
  try {
    const a = join(dir, "a.png");
    await Bun.write(a, PNG);
    const { code, seen } = await runMain(["ask", "--image", a]);
    expect(code).toBe(EXIT.ok);
    const form = seen[0]?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    const json = JSON.parse(await (form.get("request") as File).text());
    expect(json.questions.q.instructions).toBe("Ok?");
    expect(Object.keys(json.assets)).toHaveLength(1);
  } finally {
    stdin.mockRestore();
    await rm(dir, { recursive: true });
  }
});

test("`main` sends a verb with no `--image` as the JSON text it sends today", async () => {
  const { code, seen } = await runMain(["yes", "--", "Safe?"]);
  expect(code).toBe(EXIT.ok);
  expect(seen[0]?.body).toBe(
    JSON.stringify({
      state: "",
      model: "jev-latest",
      questions: { q: { type: "noul", instructions: "Safe?" } },
    }),
  );
  expect(JSON.stringify(seen[0]?.headers)).not.toContain("Danger-Zone");
});

test("`--image` followed by a flag is a usage fault, as a missing path is", () => {
  for (const argv of [
    ["yes", "--image", "--json", "--", "Q?"],
    ["yes", "--image", "--", "Q?"],
  ])
    expect(() => parseArgs(argv)).toThrow(UsageError);
});

test("`--image` with `--json` parses, and the flags stay as given", () => {
  const args = parseArgs(["yes", "--json", "--image", "a.png", "--", "Q?"]);
  expect(args.json).toBe(true);
  expect(args.images).toEqual(["a.png"]);
});

test("`main` exits 2 with no request for a GIF file", async () => {
  const r = await runBad("a.gif", GIF);
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain(r.path);
});

test("`main` exits 2 with no request for a text file with a `.png` name", async () => {
  const r = await runBad("a.png", new TextEncoder().encode("not a picture"));
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain(r.path);
});

test("`main` exits 2 with no request for an empty file", async () => {
  const r = await runBad("a.png", new Uint8Array());
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
});

test("`main` exits 2 with no request for a file over `IMAGE_BYTES_MAX`", async () => {
  expect(IMAGE_BYTES_MAX).toBe(16 * 1024 * 1024);
  const r = await runBad("big.png", PNG, IMAGE_BYTES_MAX + 1);
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain(r.path);
});

test("`main` passes a file of exactly `IMAGE_BYTES_MAX` bytes", async () => {
  const r = await runBad("max.png", PNG, IMAGE_BYTES_MAX);
  expect(r.code).toBe(EXIT.ok);
  expect(r.seen).toHaveLength(1);
});

test("`main` exits 2 with no request for a missing path", async () => {
  const r = await runBad("none.png", null);
  expect(r.code).toBe(EXIT.usage);
  expect(r.seen).toHaveLength(0);
  expect(r.text).toContain(r.path);
});
