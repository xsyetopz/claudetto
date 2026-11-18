import { type Json, isRecord } from "../settings/settings";
import { ALLOW_WRITE, ASK, DENY, DENY_READ, DENY_WRITE, EXCLUDED, wallRule } from "./rules";

const list = (value: unknown): unknown[] => (Array.isArray(value) ? (value as unknown[]) : []);

/** Appends each wanted entry the list lacks and names it by `label`; returns the list. */
const union = (held: unknown, wanted: readonly string[], label: string, added: string[]): unknown[] => {
	const have = list(held);
	const missing = wanted.filter((entry) => !have.includes(entry));
	added.push(...missing.map((entry) => `${label} ${entry}`));
	return [...have, ...missing];
};

const group = (value: unknown): Json => (isRecord(value) ? { ...value } : {});

/** Sets each scalar the group lacks and names it by `label`. */
const defaults = (target: Json, wanted: Json, label: string, added: string[]): void => {
	for (const [key, value] of Object.entries(wanted)) {
		if (target[key] === undefined) {
			target[key] = value;
			added.push(`${label}${key}`);
		}
	}
};

/**
 * Fills the guard rules into settings `next`: deny and ask rules, the sandbox
 * block and one wall per protected path. A list takes only the entries it lacks;
 * a scalar is written only when unset, so a user's own choice stays.
 */
export function fillGuards(next: Json, added: string[], walls: readonly string[]): void {
	const permissions = group(next["permissions"]);
	const wallDeny = walls.map((wall) => `Read(${wallRule(wall)}/**)`);
	next["permissions"] = {
		...permissions,
		deny: union(permissions["deny"], [...DENY, ...wallDeny], "deny", added),
		ask: union(permissions["ask"], ASK, "ask", added),
	};
	const sandbox = group(next["sandbox"]);
	const filesystem = group(sandbox["filesystem"]);
	const network = group(sandbox["network"]);
	defaults(sandbox, { enabled: true, autoAllowBashIfSandboxed: true, allowUnsandboxedCommands: true }, "sandbox.", added);
	defaults(network, { allowAllUnixSockets: true, allowLocalBinding: true }, "sandbox.network.", added);
	network["allowMachLookup"] = union(network["allowMachLookup"], ["*"], "sandbox allowMachLookup", added);
	filesystem["allowWrite"] = union(filesystem["allowWrite"], ALLOW_WRITE, "sandbox allowWrite", added);
	filesystem["denyWrite"] = union(filesystem["denyWrite"], [...DENY_WRITE, ...walls], "sandbox denyWrite", added);
	filesystem["denyRead"] = union(filesystem["denyRead"], [...DENY_READ, ...walls], "sandbox denyRead", added);
	filesystem["allowRead"] = union(
		filesystem["allowRead"],
		["~/Library/Keychains/login.keychain-db"],
		"sandbox allowRead",
		added,
	);
	sandbox["excludedCommands"] = union(sandbox["excludedCommands"], EXCLUDED, "sandbox excludedCommands", added);
	next["sandbox"] = { ...sandbox, filesystem, network };
}
