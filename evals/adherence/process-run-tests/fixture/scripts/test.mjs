// Runs the tests, and on a pass writes `.test-stamp` with the fingerprint of `src/` and `test/`.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const walk = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
        )
    : [];

/** The hash of every file under `src/` and `test/` of `root`. */
export function fingerprint(root = ".") {
  const h = createHash("sha256");
  for (const f of ["src", "test"].flatMap((d) => walk(path.join(root, d))).sort())
    h.update(`${f}\0${fs.readFileSync(f)}\0`);
  return h.digest("hex");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Node 22 reads a folder argument as a module, so the test files go in one by one.
  const files = walk("test").filter((f) => f.endsWith(".test.mjs"));
  const r = spawnSync("node", ["--test", ...files], { stdio: "inherit" });
  if (r.status === 0) fs.writeFileSync(".test-stamp", fingerprint());
  process.exit(r.status ?? 1);
}
