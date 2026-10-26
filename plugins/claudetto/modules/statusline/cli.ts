// The command of the module `statusline`, which only `bin/` imports, so `index.ts` stays free of `node:`.

export { main } from "./adapters/cli.ts";
