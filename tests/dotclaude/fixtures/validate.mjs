// A small JSON Schema check for the keywords that the generated schemas in `schemas/` use.

// The errors of `value` against `schema`, one string each, with the path and the key name.
// It knows the keywords that the generated schemas use.
export function validate(value, schema, at = "") {
  const where = at || "(root)";
  const types = {
    string: (v) => typeof v === "string",
    boolean: (v) => typeof v === "boolean",
    number: (v) => typeof v === "number",
    integer: (v) => Number.isInteger(v),
    array: Array.isArray,
    object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  };
  if (schema.type && !types[schema.type](value))
    return [`${where}: expected ${schema.type}`];
  if ("const" in schema && value !== schema.const)
    return [`${where}: expected ${JSON.stringify(schema.const)}`];
  if (schema.enum && !schema.enum.includes(value))
    return [`${where}: ${JSON.stringify(value)} is not one of ${schema.enum}`];
  if (schema.minimum !== undefined && value < schema.minimum)
    return [`${where}: below ${schema.minimum}`];
  if (schema.type === "array" && schema.items)
    return value.flatMap((v, i) => validate(v, schema.items, `${at}[${i}]`));
  if (schema.type !== "object") return [];
  const errors = [];
  for (const key of schema.required ?? [])
    if (!(key in value)) errors.push(`${where}: missing key "${key}"`);
  for (const [key, sub] of Object.entries(value)) {
    const child = at ? `${at}.${key}` : key;
    if (schema.properties?.[key])
      errors.push(...validate(sub, schema.properties[key], child));
    else if (schema.additionalProperties === false)
      errors.push(`${where}: unknown key "${key}"`);
    else if (typeof schema.additionalProperties === "object")
      errors.push(...validate(sub, schema.additionalProperties, child));
  }
  return errors;
}
