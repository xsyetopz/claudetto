// The `Store` of Node for the `dotclaude-start` CLI: the `FileReader` of the kernel, plus a modification time.

import fs from "node:fs/promises";
import { fileReader } from "../../../../../kernel/node/fs.ts";
import type { Store } from "../ports.ts";

export const store: Store = {
  ...fileReader,
  mtime: async (file) => (await fs.stat(file)).mtimeMs,
};
