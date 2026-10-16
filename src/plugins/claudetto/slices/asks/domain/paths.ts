// The path operations of the asks, with no import, so that the hooks module can use them.
// The kernel path code is for CLIs only, so the slice keeps its own copy.
// Each function takes `/` and `\` as separators, and a drive letter such as `C:` at the start.
// Each result uses `/` only, and a drive letter stays at the start of an absolute path.
// A relative path has no cwd here, so `resolve` gives a relative result for a relative input.

const DRIVE = /^[A-Za-z]:/;

/** `p` with `/` for each `\`. */
export const toSlash = (p: string): string => p.replace(/\\/g, "/");

/** True when `p` starts at a root: a `/` or `\`, or a drive letter and one of them. */
export const isAbsolute = (p: string): boolean =>
  /^(?:[A-Za-z]:)?[\\/]/.test(p);

/** `p` with `/` separators, and with each `.` and empty part removed. A `..` cancels the part before it. A trailing separator stays. */
export const normalize = (p: string): string => {
  const s = toSlash(p);
  const drive = DRIVE.exec(s);
  const head = drive ? drive[0] : "";
  const body = s.slice(head.length);
  const abs = body.startsWith("/");
  const out: string[] = [];
  for (const part of body.split("/")) {
    if (part === "" || part === ".") continue;
    if (part !== "..") out.push(part);
    else if (out.length > 0 && out[out.length - 1] !== "..") out.pop();
    else if (!abs) out.push("..");
  }
  const tail = out.length > 0 && body.endsWith("/") ? "/" : "";
  const joined = out.join("/") + tail;
  if (abs) return `${head}/${joined}`;
  return joined === "" ? `${head}.` : head + joined;
};

/** The path of the parts, from the last absolute part, with no trailing separator except at a root. */
export const resolve = (...parts: string[]): string => {
  let acc = "";
  for (const part of parts) {
    if (part === "") continue;
    acc = isAbsolute(part) || acc === "" ? part : `${acc}/${part}`;
  }
  const n = normalize(acc);
  const root = /^(?:[A-Za-z]:)?\/$/.test(n);
  return n.endsWith("/") && !root ? n.slice(0, -1) : n;
};

/** The root of a normalized path, which is a drive letter and `/`, a `/`, or empty, and its parts. */
const split = (n: string): { root: string; parts: string[] } => {
  const drive = DRIVE.exec(n);
  const head = drive ? drive[0] : "";
  const body = n.slice(head.length);
  const abs = body.startsWith("/");
  const parts = body.split("/").filter((part) => part !== "");
  return { root: head + (abs ? "/" : ""), parts };
};

/** The path from `from` to `to`, with a `..` part for each step up. The paths of two roots give `to` as it is. */
export const relative = (from: string, to: string): string => {
  const a = split(normalize(from));
  const b = split(normalize(to));
  if (a.root !== b.root) return resolve(to);
  let i = 0;
  while (i < a.parts.length && a.parts[i] === b.parts[i]) i += 1;
  const ups = Array.from({ length: a.parts.length - i }, () => "..");
  return [...ups, ...b.parts.slice(i)].join("/");
};
