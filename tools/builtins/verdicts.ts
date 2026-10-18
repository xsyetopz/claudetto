// The verdicts on the built-in parts, written by hand.
// The key is `group:name`, as the tables of `wiki/reference/Builtins*.md` show them.
// A part with no entry has the verdict `todo`, and `bun tools/builtins.ts --strict` fails until none is left.
//   replace: claudetto replaces it with a better part.
//   off:     claudetto cannot replace it, it is not needed, so claudetto turns it off.
//   keep:    it stays as it is, and the reason names the lever that is missing.
// `bytes` is the context that an `off` verdict saves or a `replace` verdict adds.

export type Verdict = {
  verdict: "replace" | "off" | "keep";
  reason: string;
  bytes?: number;
};

// biome-ignore format: a table
export const VERDICTS: Record<string, Verdict> = {
  "commands:goal": { verdict: "replace", reason: "Part 2 of `builtins-0-2-0`: the goal engine keeps the name and the form.",
  },
  "commands:advisor": { verdict: "replace", reason: "Part 3 of `builtins-0-2-0`: an advisor that the user controls.",
  },
  "servertools:advisor": { verdict: "replace", reason: "Part 3 of `builtins-0-2-0`: no hook can refuse a server tool, so the engine turns it off and registers a tool.",
  },
};
