// The types that the files of the schema feature pass to each other.

// The `[name, args]` of one call in a chain, such as `describe("x")`.
export type Call = [name: string, args: string];

// The head of a type chain, the arguments of the head, and the calls after it.
export type Chain = { head: string; headArgs?: string; calls: Call[] };

// The meaning of each minified helper name in one version of Claude Code.
export type TypeTable = Record<string, string>;

// The state of one build: the bundle text, the helper table, and the names in progress.
export type Ctx = { src: string; types: TypeTable; stack: Set<string> };

// A JSON Schema node. The keys that the feature reads or writes are typed.
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
