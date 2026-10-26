// Tests of the path facts of the `guard` slice (task 9.11 of change `release-0-3-0-alpha-2`).
// The tests give words as strings and read no file.

import { expect, test } from "bun:test";
import {
  ENV_FILE,
  namesSecret,
  type Places,
  pathOf,
} from "../../../plugins/claudetto/modules/gate/domain/paths.ts";
import { baseName } from "../../../plugins/claudetto/modules/shell/domain/wrappers.ts";
import corpus from "./corpus/gate.json" with { type: "json" };

const at: Places = {
  cwd: "/p",
  home: "/u",
  tmp: "/t",
  temps: ["/t", "/tmp", "/private/tmp"],
};

const HOME_SECRETS = [
  ".ssh/",
  ".gnupg/",
  ".aws/credentials",
  ".netrc",
  ".docker/config.json",
];

/** `namesSecret` before the pre-check, kept whole as the reference. */
const reference = (dir: string, word: string, places: Places): boolean =>
  [word, ...word.split(/[=:,]/)].some((part) => {
    const path = pathOf(dir, part, places);
    if (path === null) return false;
    return (
      ENV_FILE.test(baseName(path)) ||
      HOME_SECRETS.some((s) => {
        const name = s.replace(/\/$/, "");
        const home = /^(?:\/(?:Users|home)\/[^/]+|\/root|\/var\/root)/.exec(
          path,
        );
        const roots = [`${places.home}/${name}`];
        if (home) roots.push(`${home[0]}/${name}`);
        return roots.some((root) =>
          s.endsWith("/")
            ? path === root || path.startsWith(`${root}/`)
            : path === root,
        );
      })
    );
  });

const DIRS = ["/p", "/", "/u", "/u/.ssh", "/u/.ssh/k", "/p/.hid", "/p/a.b"];
const HOMES = ["/u", "/h/.x"];

/** Each word of the corpus, and each word that joins up to four of the pieces, so each mix of `.`, `$`, and `~` occurs. */
const words = (): string[] => {
  const pieces = ["a", "/", ".", "$", "~", ".env", ".ssh", "=", ":", "HOME"];
  const out = new Set<string>(
    Object.values(corpus).flatMap((cs) => cs.flatMap((c) => c.split(/\s+/))),
  );
  let layer = [""];
  for (let n = 0; n < 4; n++) {
    layer = layer.flatMap((w) => pieces.map((p) => w + p));
    for (const w of layer) out.add(w);
  }
  return [...out];
};

test("the pre-check of `namesSecret` changes no result on the corpus words and on each mix of `.`, `$`, and `~`", () => {
  const all = words();
  const mixes = new Set(
    all.map((w) =>
      [...w]
        .filter((c) => ".$~".includes(c))
        .sort()
        .join(""),
    ),
  );
  expect(mixes.size).toBeGreaterThanOrEqual(8);
  const wrong: string[] = [];
  for (const home of HOMES)
    for (const dir of DIRS)
      for (const word of all)
        if (
          namesSecret(dir, word, { ...at, home }) !==
          reference(dir, word, { ...at, home })
        )
          wrong.push(`${home} ${dir} ${word}`);
  expect(wrong).toStrictEqual([]);
});

test("a word of a working folder inside `~/.ssh` is a secret, and a word with no `.` is not one elsewhere", () => {
  expect(namesSecret("/u/.ssh", "id_rsa", at)).toBe(true);
  expect(namesSecret("/u/.ssh/keys", "k", at)).toBe(true);
  expect(namesSecret("/p", "id_rsa", at)).toBe(false);
  expect(namesSecret("/p", "src/a", at)).toBe(false);
});
