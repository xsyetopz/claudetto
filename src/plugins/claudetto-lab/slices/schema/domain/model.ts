// The types that the files of the schema slice pass to each other.

// The `[name, args]` of one call in a chain, such as `describe("x")`.
export type Call = [name: string, args: string];

// The head of a type chain, the arguments of the head, and the calls after it.
export type Chain = { head: string; headArgs?: string; calls: Call[] };

// The state of one build: the bundle text and the names in progress.
// `defs` holds the end of each definition before the schema, by name, after the first lookup.
// `scopes` holds the module of the schema and the module of each name that it imports, after the first lookup.
// `kinds` holds the meaning of each helper name that the build read (`helpers.ts`).
export type Ctx = {
  src: string;
  stack: Set<string>;
  defs?: Map<string, number[]>;
  scopes?: {
    home: string;
    imported: Map<string, { text: string; local: string }>;
  };
  kinds?: Map<string, string | undefined>;
};

// A JSON Schema node. The keys that the slice reads or writes are typed.
// Any other key of the schema is unknown.
export type Schema = {
  type?: string;
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: Schema | boolean;
  anyOf?: Schema[];
  required?: string[];
  [key: string]: unknown;
};
