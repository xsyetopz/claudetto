import { hostFromUname } from "../../../tiers/optional/host.ts";
import { type Install, installFor } from "../../../tiers/optional/install.ts";
import { binaryNames, isOnPath } from "../../../tiers/optional/locate.ts";
import { noticeKey, RELEASES_PAGE } from "../../../tiers/optional/notice.ts";
import {
	OPTIONAL_TOOLS,
	type OptionalTool,
} from "../../../tiers/optional/tools.ts";
import { type ToolsIo, YES } from "./io.ts";

const askInstall = async (
	io: ToolsIo,
	tool: OptionalTool,
	shown: string,
): Promise<string | undefined> => {
	try {
		return await io.ask(
			`\`${tool.id}\` is not installed. Run \`${shown}\`?`,
			"Install tool",
		);
	} catch {
		return undefined;
	}
};

const runInstall = async (
	io: ToolsIo,
	tool: OptionalTool,
	install: Extract<Install, { kind: "command" }>,
): Promise<string> => {
	const answer = await askInstall(io, tool, install.shown);
	if (answer === undefined) {
		return `Ran nothing for \`${tool.id}\`: the question was dismissed, or this session has no one to answer.`;
	}
	if (answer.trim() !== YES) {
		await io.decline(noticeKey(tool), tool.version);
		return `Did not install \`${tool.id}\`. The launch notice stays quiet.`;
	}
	try {
		const result = await io.run(install.argv);
		return result.exitCode === 0
			? `Ran \`${install.shown}\`.`
			: `\`${install.shown}\` failed with exit code ${result.exitCode}: ${result.text.trim()}`;
	} catch (error) {
		return `Could not run \`${install.shown}\` (${String(error)}).`;
	}
};

const offerFor = async (
	io: ToolsIo,
	tool: OptionalTool,
	install: Install,
): Promise<string> => {
	if (install.kind === "command") {
		return runInstall(io, tool, install);
	}
	if (install.kind === "zip") {
		return `\`${tool.id}\` has no package manager here, so nothing was run. ${install.shown}.`;
	}
	return `\`${tool.id}\` has no install known for this platform, so nothing was run. Releases are at ${RELEASES_PAGE}.`;
};

const offerTool = async (
	io: ToolsIo,
	tool: OptionalTool,
): Promise<string | undefined> => {
	const host = hostFromUname(await io.uname("-s"), await io.uname("-m"));
	const path = await io.path();
	if (await isOnPath(binaryNames(tool, host), host, path, io.exists)) {
		return undefined;
	}
	const hasBrew =
		host.platform !== "win32" &&
		(await isOnPath(["brew"], host, path, io.exists));
	return offerFor(io, tool, installFor(tool, host, hasBrew));
};

/** Each missing optional tool: its install command shown and run after a yes, one dialog at a time. */
export const toolsPart = async (io: ToolsIo): Promise<string | undefined> => {
	const lines = await OPTIONAL_TOOLS.reduce<Promise<string[]>>(
		async (chain, tool) => {
			const held = await chain;
			const line = await offerTool(io, tool);
			return line === undefined ? held : [...held, line];
		},
		Promise.resolve([]),
	);
	return lines.length === 0 ? undefined : lines.join("\n");
};
