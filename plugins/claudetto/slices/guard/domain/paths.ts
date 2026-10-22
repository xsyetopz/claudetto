// The path facts of the permission gate: where a word of a command points, and what kind of folder holds it.
// The functions are pure, and the folders of the session come in `Places`.

import { baseName } from "../../../kernel/wrappers.ts";

/** The folders of the session: the project, the home folder, and the temp folder. */
export type Places = { cwd: string; home: string; tmp: string };

/** The folders that a build or an install writes again, so a delete in them loses no source. */
const BUILD = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".parcel-cache",
  ".build",
  "DerivedData",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".venv",
  ".gradle",
]);

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

/** `word` with a leading `~`, `$HOME`, or `$TMPDIR` replaced by its folder. */
const expand = (word: string, at: Places): string =>
  word
    .replace(/^~(?=\/|$)/, at.home)
    .replace(/^\$(?:HOME|\{HOME\})(?=\/|$)/, at.home)
    .replace(/^\$(?:TMPDIR|\{TMPDIR\})(?=\/|$)/, at.tmp);

/**
 * The absolute path of the word `word` from the folder `dir`, or `null` when the gate cannot read it:
 * an empty word (a substitution), or a word with a variable, a backtick, or `{}` after the expansion.
 * A glob part and each part after it are cut, so `src/*.ts` points to `src`.
 */
export const pathOf = (
  dir: string,
  word: string,
  at: Places,
): string | null => {
  const text = expand(word, at);
  if (text === "" || /[$`]|\{\}/.test(text)) return null;
  const glob = text.search(/[*?[]/);
  const plain =
    glob < 0 ? text : text.slice(0, text.lastIndexOf("/", glob) + 1);
  return normal(plain.startsWith("/") ? plain : `${dir}/${plain}`);
};

/** True when `path` is `root` or in it. */
export const under = (path: string, root: string): boolean =>
  path === root || path.startsWith(root === "/" ? "/" : `${root}/`);

/** True when `path` is in the temp folder, but is not the temp folder itself. */
export const inTmp = (path: string, at: Places): boolean =>
  [at.tmp, "/tmp", "/private/tmp"].some(
    (root) => path !== root && under(path, root),
  );

export const inBuild = (path: string, at: Places): boolean =>
  under(path, at.cwd) &&
  path
    .slice(at.cwd.length)
    .split("/")
    .some((part) => BUILD.has(part));

export const isSystem = (path: string): boolean => SYSTEM.test(path);

const isEnvName = (name: string): boolean => ENV_FILE.test(name);

const isSecretPath = (path: string, at: Places): boolean =>
  isEnvName(baseName(path)) ||
  HOME_SECRETS.some((s) =>
    s.endsWith("/")
      ? under(path, `${at.home}/${s.slice(0, -1)}`)
      : path === `${at.home}/${s}`,
  );

export const namesSecret = (dir: string, word: string, at: Places): boolean =>
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
  return [".env", ".env.local"].some((name) => re.test(name));
};

export const codeNamesSecret = (code: string): boolean =>
  [...code.matchAll(/(?<![\w.-])\.env(?:\.[\w.-]+)?(?![\w.-])/g)].some((m) =>
    isEnvName(m[0]),
  );
