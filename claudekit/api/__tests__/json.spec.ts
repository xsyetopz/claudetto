import { describe, expect, test } from "bun:test";
import { fieldOf, objectOf, parsedOf } from "../json.ts";

describe("the JSON helpers", () => {
	test("`objectOf` gives `{}` for anything that is not a plain object", () => {
		expect(objectOf([1])).toEqual({});
		expect(objectOf(null)).toEqual({});
		expect(objectOf({ a: 1 })).toEqual({ a: 1 });
	});

	test("`parsedOf` gives `{}` for text that is not JSON", () => {
		expect(parsedOf("{")).toEqual({});
		expect(parsedOf('{"a":1}')).toEqual({ a: 1 });
	});

	test("`fieldOf` reads a key of an object and gives `undefined` otherwise", () => {
		expect(fieldOf({ a: 1 }, "a")).toBe(1);
		expect(fieldOf({ a: 1 }, "b")).toBeUndefined();
		expect(fieldOf("a", "length")).toBeUndefined();
	});
});
