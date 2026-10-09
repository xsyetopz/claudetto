import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const yaml = read("./config.yaml").match(/^timeout_ms: (\d+)/m)[1];
const local = JSON.parse(read("./.local.json"));
export const t9 = () => Number(yaml) + local.timeout_ms + 9;
