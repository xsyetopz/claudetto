#!/usr/bin/env -S bun --no-env-file
// A stdio MCP server with `N` tools that do nothing, so a run can add and drop tools without any real server.

import { createInterface } from "node:readline";
import { fieldOf, parsedOf } from "../api/json.ts";

const count = Number(process.env["N"] ?? 3);
const tools = Array.from({ length: count }, (_, at) => ({
	name: `probe_${at}`,
	description: `Probe tool ${at}`,
	inputSchema: { type: "object", properties: {} },
}));

const resultFor = (method: unknown, params: unknown): unknown => {
	if (method === "initialize") {
		return {
			protocolVersion: fieldOf(params, "protocolVersion"),
			capabilities: { tools: {} },
			serverInfo: { name: "probe", version: "1" },
		};
	}
	return method === "tools/list" ? { tools } : {};
};

createInterface({ input: process.stdin }).on("line", (line) => {
	const message = parsedOf(line);
	// A notification has no `id` and takes no answer.
	if (message["id"] === undefined) {
		return;
	}
	const result = resultFor(message["method"], message["params"]);
	process.stdout.write(
		`${JSON.stringify({ jsonrpc: "2.0", id: message["id"], result })}\n`,
	);
});
