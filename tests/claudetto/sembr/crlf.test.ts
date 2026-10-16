// An `Edit` repair of a CRLF file keeps the line ending of the file in `new_string`.

import { expect, test } from "bun:test";
import { repairEdit } from "../../../src/plugins/claudetto/slices/sembr/domain/rewrite.ts";

test("`repairEdit` gives a `new_string` with CRLF when the matched text has CRLF", () => {
  const file = "# T\r\n\r\nAaa.\r\nBbb.\r\nCcc.\r\n";
  const fix = repairEdit(file, "Aaa. Bbb.", "Aaa. Zzz. Bbb.");
  expect(fix?.old_string).toBe("Aaa.\r\nBbb.");
  expect(fix?.new_string).toBe("Aaa.\r\nZzz.\r\nBbb.");
});

test("`repairEdit` keeps LF in `new_string` when the file uses LF", () => {
  const file = "# T\n\nAaa.\nBbb.\nCcc.\n";
  const fix = repairEdit(file, "Aaa. Bbb.", "Aaa. Zzz. Bbb.");
  expect(fix?.new_string).toBe("Aaa.\nZzz.\nBbb.");
});
