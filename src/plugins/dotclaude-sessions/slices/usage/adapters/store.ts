// The `Store` of Node for the `dotclaude-usage` CLI: the `FileReader` of the kernel, plus a recursive list and a modification time.

import fs from "node:fs/promises";
import { fileReader } from "../../../../../kernel/node/fs.ts";
import type { Store } from "../ports.ts";

export const store: Store = {
  ...fileReader,
  // A missing folder is an error here, because the report needs its `projects` folder.
  tree: async (root) => fs.readdir(root, { recursive: true }),
  mtime: async (file) => (await fs.stat(file)).mtimeMs,
};
