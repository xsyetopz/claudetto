import { report } from "./report.mjs";

export const toFile = (rows) => report(rows, {}).split("\n");
