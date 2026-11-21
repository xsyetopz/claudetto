import { expect, test } from "bun:test";

import {
	isSubagentRequest,
	startFakeApi,
	streamedReply,
	SUBAGENT_MARKER
} from "../measure-tools/fake-api";
import { deferredListing, measureTools } from "../measure-tools/measure";

test("measureTools sizes the array and each tool as JSON", () => {
	// Arrange
	const tools = [{ name: "a", description: "xx" }, { name: "b" }];

	// Act
	const bytes = measureTools(tools);

	// Assert
	expect(bytes.total).toBe(JSON.stringify(tools).length);
	expect(bytes.perTool).toEqual({
		a: JSON.stringify(tools[0]).length,
		b: JSON.stringify(tools[1]).length
	});
});

test("measureTools counts UTF-8 bytes apart from characters", () => {
	// Act
	const bytes = measureTools([{ name: "é" }]);

	// Assert
	expect(bytes.utf8).toBe(bytes.total + 1);
});

test("streamedReply for text ends the stream with end_turn", () => {
	// Act
	const body = streamedReply({ text: "ok" });

	// Assert
	expect(body).toContain('"stop_reason":"end_turn"');
	expect(body).toContain('"text":"ok"');
});

test("streamedReply for a tool carries its name and input as a json delta", () => {
	// Act
	const body = streamedReply({ tool: "Agent", input: { prompt: "p" } });

	// Assert
	expect(body).toContain('"name":"Agent"');
	expect(body).toContain('"stop_reason":"tool_use"');
	expect(body).toContain(String.raw`"partial_json":"{\"prompt\":\"p\"}"`);
});

test("isSubagentRequest accepts the marker without a tool_use block", () => {
	// Act
	const sub = isSubagentRequest([{ role: "user", content: SUBAGENT_MARKER }]);

	// Assert
	expect(sub).toBe(true);
});

test("isSubagentRequest refuses the main loop's follow-up that holds the Agent tool_use", () => {
	// Arrange
	const followUp = [
		{
			role: "assistant",
			content: [{ type: "tool_use", input: { prompt: SUBAGENT_MARKER } }]
		}
	];

	// Act
	const sub = isSubagentRequest(followUp);

	// Assert
	expect(sub).toBe(false);
});

test("deferredListing returns only the listing block of the session-context message", () => {
	// Arrange
	const messages = [
		{
			content: [
				{
					type: "text",
					text: "# Environment\n - Platform: darwin\n\nThe following deferred tools are now available:\nMonitor\nTaskStop\n\n# Output Style: X\nbody"
				}
			]
		}
	];

	// Act
	const listing = deferredListing(messages);

	// Assert
	expect(listing).toBe(
		"The following deferred tools are now available:\nMonitor\nTaskStop"
	);
});

test("deferredListing is undefined when no message names deferred tools", () => {
	// Act
	const listing = deferredListing([{ content: "hi" }]);

	// Assert
	expect(listing).toBeUndefined();
});

test("the fake API records a request body and answers with an event stream", async () => {
	// Arrange
	const api = startFakeApi(false);
	try {
		// Act
		const res = await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify({ tools: [{ name: "t" }], messages: [] })
		});
		const text = await res.text();

		// Assert
		expect(res.headers.get("content-type")).toBe("text/event-stream");
		expect(text).toContain("message_stop");
		expect(api.requests).toHaveLength(1);
		expect(api.requests[0]?.body["tools"]).toEqual([{ name: "t" }]);
	} finally {
		await api.stop();
	}
});

test("the fake API answers the first main-loop request with an Agent tool_use when asked", async () => {
	// Arrange
	const api = startFakeApi(true, "claudetto:Heracles");
	try {
		// Act
		const res = await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify({ tools: [{ name: "t" }], messages: [] })
		});
		const text = await res.text();

		// Assert
		expect(text).toContain('"name":"Agent"');
		expect(text).toContain("claudetto:Heracles");
	} finally {
		await api.stop();
	}
});
