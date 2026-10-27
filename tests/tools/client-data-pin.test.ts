// Spec `prompt-base`, "Model Line": the `models` block reads `clientDataCacheSlots` of `.claude.json`, which no doc states (undocumented-facts rule).
// The fixture holds the source of the slot write, and each check fails when an update changes it or when `MIN_CLAUDE_CODE_VERSION` moves past the fixture. The key `cedar_lagoon` is server data, so no source pins it.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile } from "bun";
import { MIN_CLAUDE_CODE_VERSION } from "../../tools/limits.ts";
import { REPO } from "../support/repo.ts";

const FIXTURE = path.join(
	REPO,
	"tests/claudetto/session/prompt/fixtures/client-data-2.1.310.json",
);

const read = async (): Promise<{
	version: string;
	clientData: string;
	slotWrite: string;
}> => bunFile(FIXTURE).json();

test("Client Data Pin: the fixture is for `MIN_CLAUDE_CODE_VERSION`", async () => {
	expect((await read()).version).toBe(MIN_CLAUDE_CODE_VERSION);
});

test("Client Data Pin: the bootstrap `client_data` goes into `clientDataCacheSlots` as `data`, with the write time as `at`", async () => {
	const { clientData, slotWrite } = await read();
	expect(clientData).toContain("O=d.client_data??null");
	expect(slotWrite).toContain("clientDataCacheSlots:");
	expect(slotWrite).toContain("{data:O,at:Date.now()");
});
