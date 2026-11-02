import { HAIKU_MODEL, type TierRow } from "../../tiers/tiers.ts";

const FAMILIES = ["opus", "sonnet", "haiku"] as const;

/** A dated alias of a row's model, such as `claude-opus-5-5-20261101`, is the same model. */
const isNamed = (model: string, names: readonly string[]): boolean =>
	names.some((name) => model === name || model.startsWith(`${name}-`));

/** The line for a response from a model the row does not name, or `undefined` when the row names it. */
export const offRowLine = (model: string, row: TierRow): string | undefined => {
	const names = [row.mainModel, row.subagentModel, HAIKU_MODEL].filter(
		(name) => name !== undefined,
	);
	if (isNamed(model, names)) {
		return undefined;
	}
	const family = FAMILIES.find((name) => model.includes(name));
	const expected =
		names.find((name) => family !== undefined && name.includes(family)) ??
		row.mainModel;
	return expected === undefined
		? undefined
		: `A response came from \`${model}\`, and the \`${row.tier}\` row names \`${expected}\`.`;
};
