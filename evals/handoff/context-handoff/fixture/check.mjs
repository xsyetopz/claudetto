// The check of task 1.N: `node check.mjs N` passes when `notes/codes.md` has the audit code of `data/part-NN.log`.
import fs from "node:fs";

const n = String(Number(process.argv[2])).padStart(2, "0");
const code = /audit code is (\S+)/.exec(
  fs.readFileSync(`data/part-${n}.log`, "utf8"),
)?.[1];
const notes = fs.readFileSync("notes/codes.md", "utf8");
if (code && notes.split("\n").some((l) => l.trim() === `part-${n}: ${code}`)) {
  console.log(`pass: part-${n}`);
} else {
  console.log(`fail: part-${n} has no correct line in notes/codes.md`);
  process.exit(1);
}
