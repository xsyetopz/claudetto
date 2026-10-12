// The `FileReader` of Node, for the CLIs. A missing file gives null, and a missing folder gives an empty list.

import fs from "node:fs";
import { rethrowUnless, UNREADABLE } from "../errors.ts";
import type { FileReader } from "../ports.ts";

export const fileReader: FileReader = {
  read: (file) => {
    try {
      return fs.readFileSync(file, "utf8");
    } catch (err) {
      rethrowUnless(err, ...UNREADABLE);
      return null;
    }
  },
  list: (dir) => {
    try {
      return fs.readdirSync(dir);
    } catch (err) {
      rethrowUnless(err, ...UNREADABLE);
      return [];
    }
  },
};
