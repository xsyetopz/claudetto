import { expect, test } from "bun:test";
import { price } from "./price.ts";

test("two units cost 4.2", () => {
	expect(price(2)).toBe(4.2);
});
