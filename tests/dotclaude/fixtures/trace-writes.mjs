// A preload for a node run: it appends the path of each file write, copy, remove, or folder make
// to the file named by `TRACE_WRITES_FILE`. The write still happens.

import fs from "node:fs";

const log = process.env.TRACE_WRITES_FILE;
const append = fs.appendFileSync;
let logging = false;
for (const name of [
  "writeFileSync",
  "appendFileSync",
  "copyFileSync",
  "mkdirSync",
  "rmSync",
  "renameSync",
  "unlinkSync",
]) {
  const real = fs[name];
  fs[name] = (...args) => {
    if (logging) return real(...args);
    logging = true;
    for (const arg of name === "copyFileSync" || name === "renameSync"
      ? args.slice(0, 2)
      : args.slice(0, 1))
      if (typeof arg === "string") append(log, `${arg}\n`);
    logging = false;
    return real(...args);
  };
}
