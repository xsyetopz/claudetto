import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const tempDir = (prefix: string): Promise<string> =>
	mkdtemp(join(tmpdir(), `${prefix}-`));
