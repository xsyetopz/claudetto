// The path normalizer of the matchers: it drops a trailing `/*`, the `.` and empty segments, and resolves each `..`.
// A home word, such as `~`, `~user`, `$HOME`, or `${HOME}`, stays the first segment, and a `..` above it reads as the root.
// The function is pure, so the matchers and the adapter can both use it.

const HOME = /^(~[^/]*|\$HOME|\$\{HOME\})(?=\/|$)/;

/**
 * The normal form of a path word: `""` is the root, `.` is the working directory, and a home word is kept.
 * A `..` that climbs above a home word gives the root, because the folder above the home folders is a system folder.
 */
export const normPath = (word: string): string => {
  const path = word.replace(/\/\*$/, "/").replace(/\\+$/, "");
  let abs = path.startsWith("/");
  let home = abs ? undefined : HOME.exec(path)?.[1];
  const rest = path.slice(abs ? 1 : (home?.length ?? 0));
  const segs: string[] = [];
  for (const seg of rest.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg !== "..") segs.push(seg);
    else if (segs.length && segs.at(-1) !== "..") segs.pop();
    else if (home !== undefined) {
      home = undefined;
      abs = true;
    } else if (!abs) segs.push("..");
  }
  const body = segs.join("/");
  if (abs) return body === "" ? "" : `/${body}`;
  if (home !== undefined) return body === "" ? home : `${home}/${body}`;
  return body === "" ? "." : body;
};
