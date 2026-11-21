import type { Json } from "../../settings/settings";
import {
	ALLOW_WRITE,
	ASK,
	DENY,
	DENY_READ,
	DENY_WRITE,
	EXCLUDED,
	wallRule
} from "./rules";

/**
 * The guard part of claudetto's settings: deny and ask rules, the sandbox block
 * and one wall per protected path. Built from this release's rules alone, so the
 * fill can state what claudetto wants without reading what a user holds.
 *
 * @param walls Protected paths, each a `Read` deny rule and a sandbox read and write wall.
 * @returns The settings object the fill merges into the rest of the construction.
 */
export function guardSettings(walls: readonly string[]): Json {
	return {
		permissions: {
			deny: [...DENY, ...walls.map((wall) => `Read(${wallRule(wall)}/**)`)],
			ask: [...ASK]
		},
		sandbox: {
			enabled: true,
			autoAllowBashIfSandboxed: true,
			allowUnsandboxedCommands: true,
			network: {
				allowAllUnixSockets: true,
				allowLocalBinding: true,
				allowMachLookup: ["*"]
			},
			filesystem: {
				allowWrite: [...ALLOW_WRITE],
				denyWrite: [...DENY_WRITE, ...walls],
				denyRead: [...DENY_READ, ...walls],
				allowRead: ["~/Library/Keychains/login.keychain-db"]
			},
			excludedCommands: [...EXCLUDED]
		}
	};
}
