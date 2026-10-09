import { parseArgs } from "./args.mjs";
import { report } from "./report.mjs";

export function main(argv, rows) {
  return report(rows, parseArgs(argv));
}
