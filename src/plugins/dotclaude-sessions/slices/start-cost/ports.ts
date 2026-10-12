// The reads of the start report that a `FileReader` does not give.
// The adapter in `adapters/store.ts` gives them with Node, and a test gives them with a fake.

import type { FileReader } from "../../../../kernel/ports.ts";

/** The file reads of the report: the `FileReader` reads, plus a modification time. */
export interface Store extends FileReader {
  /** The modification time of `file` in milliseconds since the Unix epoch. It throws when `file` is absent. */
  mtime(file: string): Promise<number>;
}
