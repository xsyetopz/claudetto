import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Server } from "node:net";
import { startHost } from "./host.ts";
import { sync } from "./sync.ts";

let server: Server;
let url = "";

beforeAll(async () => {
	({ server, url } = await startHost());
});

afterAll(() => {
	server.close();
});

test("sync returns the items of the host", async () => {
	expect(await sync(url)).toEqual([{ id: 1 }, { id: 2 }]);
});
