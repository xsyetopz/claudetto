// The public surface of the slice `search`: the hooks of the search tools, and the field that holds a glob in each search tool.

export { onCall, onStart } from "./adapters/mod.ts";
export { GLOB_FIELD, GLOB_TOOL, GREP_TOOL } from "./domain/search.ts";
