import fs from "node:fs";
import * as lib from "./lib.mjs";

// The route table names the function to call.
const routes = JSON.parse(
  fs.readFileSync(new URL("./routes.json", import.meta.url), "utf8"),
);
export const u9 = () => lib[routes.user](9);
