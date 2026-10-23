// The path facts of the permission gate: where a word of a command points, and what kind of folder holds it.

import { baseName } from "../../../kernel/wrappers.ts";

/** The folders of the session: the project, the home folder, `$TMPDIR`, and each spelling of each temp folder of `kernel/tmp.ts`. */
export type Places = {
  cwd: string;
  home: string;
  tmp: string;
  temps: readonly string[];
};

/** The folders of the system that the gate keeps from each write. `/usr/local` is not one, because Homebrew writes there. */
const SYSTEM = /^\/(?:System|Library|usr(?!\/local(?:\/|$)))(?:\/|$)/;
const ENV_FILE = /^\.env(?:\.(?!(?:example|sample|template)$)[\w.-]+)?$/;
const HOME_SECRETS = [
  ".ssh/",
  ".gnupg/",
  ".aws/credentials",
  ".netrc",
  ".docker/config.json",
];

/** The normal form of the absolute path `path`, with no `.`, no `..`, and no empty part. */
const normal = (path: string): string => {
  const parts: string[] = [];
  for (const part of path.split("/"))
    if (part === "..") parts.pop();
    else if (part !== "" && part !== ".") parts.push(part);
  return `/${parts.join("/")}`;
};

/**
 * The absolute path of the word `word` from the folder `dir`, or `null` when the gate cannot read it:
 * an empty word, or a word with a variable, a backtick, or `{}` after the expansion of `~`, `$HOME`, and `$TMPDIR`.
 * A glob part and each part after it are cut, so `src/*.ts` points to `src`.
 */
export const pathOf = (
  dir: string,
  word: string,
  at: Places,
): string | null => {
  const text = word
    .replace(/^~(?=\/|$)/, at.home)
    .replace(/^\$(?:HOME|\{HOME\})(?=\/|$)/, at.home)
    .replace(/^\$(?:TMPDIR|\{TMPDIR\})(?=\/|$)/, at.tmp);
  if (text === "" || /[$`]|\{\}/.test(text)) return null;
  const glob = text.search(/[*?[]/);
  const plain =
    glob < 0 ? text : text.slice(0, text.lastIndexOf("/", glob) + 1);
  return normal(plain.startsWith("/") ? plain : `${dir}/${plain}`);
};

const under = (path: string, root: string): boolean =>
  path === root || path.startsWith(root === "/" ? "/" : `${root}/`);

/** True when `path` is in the temp folder, but is not the temp folder itself. */
export const inTmp = (path: string, at: Places): boolean =>
  at.temps.some((root) => path !== root && under(path, root));

export const isSystem = (path: string): boolean => SYSTEM.test(path);

const isSecretPath = (path: string, at: Places): boolean =>
  ENV_FILE.test(baseName(path)) ||
  HOME_SECRETS.some((s) =>
    s.endsWith("/")
      ? under(path, `${at.home}/${s.slice(0, -1)}`)
      : path === `${at.home}/${s}`,
  );

/** True when `word` points to a secret file from the folder `dir`. Each secret name has a `.`, so a word with no `.`, `$`, or `~` in a folder with no `/.` part cannot name one. */
export const namesSecret = (dir: string, word: string, at: Places): boolean =>
  (/[.$~]/.test(word) || dir.includes("/.")) &&
  [word, ...word.split(/[=:,]/)].some((part) => {
    const path = pathOf(dir, part, at);
    return path !== null && isSecretPath(path, at);
  });

/** True when the glob `glob` can match a `.env` file: its last part starts with `.` and matches `.env` or `.env.local`. */
export const globsSecret = (glob: string): boolean => {
  const last = baseName(glob);
  if (!last.startsWith(".")) return false;
  const source = last
    .replace(/[.+^${}()|\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");
  const re = new RegExp(`^${source}$`);
  return [".env", ".env.local"].some((n) => re.test(n));
};

// `$`, `)`, and `]` before `.env` make a property access, such as `$.env.get`, not a file name.
export const codeSecret = (code: string): string | undefined =>
  [...code.matchAll(/(?<![\w.$)\]-])\.env(?:\.[\w.-]+)?(?![\w.-])/g)]
    .map((m) => m[0])
    .find((name) => ENV_FILE.test(name));
