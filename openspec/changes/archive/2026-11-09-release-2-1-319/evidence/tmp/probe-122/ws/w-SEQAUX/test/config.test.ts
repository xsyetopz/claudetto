import { expect, test } from "bun:test";
import { TIMEOUT_MS } from "../src/config";
test("timeout", () => expect(TIMEOUT_MS).toBe(5000));
