// The merge of the jscpd configs, with the rules of the `extends` chain.
// A child key replaces the key of the base, an object merges deep, and a list under a key that starts with `ignore` appends.
// The key `<key>Remove` takes items out of the list of the base, and `null` deletes a key.

/** A parsed JSON object, such as a jscpd config. */
export type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const REMOVE = "Remove";

/** The list `base` with no item of `remove`, then the items of `add` that it does not hold. */
const combine = (base: unknown[], remove: unknown[], add: unknown[]) => {
  const kept = base.filter((item) => !remove.includes(item));
  return [...kept, ...add.filter((item) => !kept.includes(item))];
};

/** The config `base` with the config `child` on top of it. */
export const merge = (base: Json, child: Json): Json => {
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(child)) {
    if (key.endsWith(REMOVE)) continue;
    const current = out[key];
    const remove = child[key + REMOVE];
    if (value === null) delete out[key];
    else if (isObject(value) && isObject(current))
      out[key] = merge(current, value);
    else if (
      Array.isArray(value) &&
      Array.isArray(current) &&
      (key.startsWith("ignore") || Array.isArray(remove))
    )
      out[key] = combine(current, Array.isArray(remove) ? remove : [], value);
    else out[key] = isObject(value) ? merge({}, value) : value;
  }
  for (const [name, remove] of Object.entries(child)) {
    const key = name.slice(0, -REMOVE.length);
    const current = out[key];
    if (name.endsWith(REMOVE) && !(key in child) && Array.isArray(remove))
      if (Array.isArray(current)) out[key] = combine(current, remove, []);
  }
  return out;
};

/**
 * The config of `file` after the merge of its `extends` chain, from the first file to `file`.
 * `load` reads the config of a file, and `target` gives the file that the `extends` value `ref` of `file` names.
 */
export const resolve = async (
  file: string,
  load: (file: string) => Promise<Json>,
  target: (ref: string, from: string) => string,
  chain: readonly string[] = [],
): Promise<Json> => {
  if (chain.includes(file))
    throw new Error(`extends cycle: ${[...chain, file].join(" -> ")}`);
  const { extends: ref, ...own } = await load(file);
  if (typeof ref !== "string") return merge({}, own);
  const parent = await resolve(target(ref, file), load, target, [
    ...chain,
    file,
  ]);
  return merge(parent, own);
};
