// A small JSON Schema check for the keywords that the generated schemas in `schemas/` use.

/** The keywords of a JSON Schema that this check reads. */
export interface Schema {
	type?: string;
	const?: unknown;
	enum?: unknown[];
	minimum?: number;
	items?: Schema;
	required?: string[];
	properties?: Record<string, Schema>;
	additionalProperties?: boolean | Schema;
}

// The errors of `value` against `schema`, one string each, with the path and the key name.
// It knows the keywords that the generated schemas use.
const isRecord = (v: unknown): v is Record<string, unknown> =>
	v !== null && typeof v === "object" && !Array.isArray(v);

export const validate = (value: unknown, schema: Schema, at = ""): string[] => {
	const where = at || "(root)";
	const types: Record<string, (v: unknown) => boolean> = {
		string: (v) => typeof v === "string",
		boolean: (v) => typeof v === "boolean",
		number: (v) => typeof v === "number",
		integer: (v) => Number.isInteger(v),
		array: Array.isArray,
		object: isRecord,
	};
	if (schema.type && !types[schema.type]?.(value)) {
		return [`${where}: expected ${schema.type}`];
	}
	if ("const" in schema && value !== schema.const) {
		return [`${where}: expected ${JSON.stringify(schema.const)}`];
	}
	if (schema.enum && !schema.enum.includes(value)) {
		return [`${where}: ${JSON.stringify(value)} is not one of ${schema.enum}`];
	}
	if (
		schema.minimum !== undefined &&
		typeof value === "number" &&
		value < schema.minimum
	) {
		return [`${where}: below ${schema.minimum}`];
	}
	const { items } = schema;
	if (schema.type === "array" && items && Array.isArray(value)) {
		return value.flatMap((v, i) => validate(v, items, `${at}[${i}]`));
	}
	if (schema.type !== "object" || !isRecord(value)) {
		return [];
	}
	return objectErrors(value, schema, at);
};

// The errors of the keys of an object `object` against `schema`: missing, unknown, and nested.
const objectErrors = (
	object: Record<string, unknown>,
	schema: Schema,
	at: string,
): string[] => {
	const where = at || "(root)";
	const errors: string[] = [];
	for (const key of schema.required ?? []) {
		if (!(key in object)) {
			errors.push(`${where}: missing key "${key}"`);
		}
	}
	for (const [key, sub] of Object.entries(object)) {
		const child = at ? `${at}.${key}` : key;
		const keySchema = schema.properties?.[key];
		if (keySchema) {
			errors.push(...validate(sub, keySchema, child));
		} else if (schema.additionalProperties === false) {
			errors.push(`${where}: unknown key "${key}"`);
		} else if (typeof schema.additionalProperties === "object") {
			errors.push(...validate(sub, schema.additionalProperties, child));
		}
	}
	return errors;
};
