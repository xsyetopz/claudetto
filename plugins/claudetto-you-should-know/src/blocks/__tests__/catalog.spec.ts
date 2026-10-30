import { expect, test } from "bun:test";
import { file } from "bun";
import { CATALOG } from "../catalog.ts";

const calledBy = async (call: string): Promise<boolean> =>
	(await file(`${import.meta.dir}/../catalog.ts`).text()).includes(call);

test("the catalog holds each block once", () => {
	expect(CATALOG.map((block) => block.id)).toEqual(["you-should-know"]);
});

test("`attachBlocks` calls the attach function of `you-should-know`", async () => {
	expect(await calledBy("attachYouShouldKnow(on, context);")).toBe(true);
});
