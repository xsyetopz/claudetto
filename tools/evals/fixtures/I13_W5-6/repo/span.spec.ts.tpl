import { expect, test } from "bun:test";
import { spanLength } from "./span.ts";

test("`3-5` covers three numbers", () => {
	expect(spanLength("3-5")).toBe(3);
});
