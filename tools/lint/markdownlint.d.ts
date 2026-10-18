// The part of the `markdownlint` API that the custom rules and their tests use. `markdownlint-cli2` ships it with no types.

declare module "markdownlint-cli2/markdownlint" {
  export type RuleError = {
    lineNumber: number;
    detail?: string;
    context?: string;
    fixInfo?: {
      lineNumber?: number;
      editColumn?: number;
      deleteCount?: number;
      insertText?: string;
    };
  };
  export type Rule = {
    names: string[];
    description: string;
    tags: string[];
    parser: "micromark" | "markdownit" | "none";
    function: (
      params: {
        lines: string[];
        parsers: {
          micromark: { tokens: { type: string; startLine: number }[] };
        };
      },
      onError: (error: RuleError) => void,
    ) => void;
  };
}

declare module "markdownlint-cli2/markdownlint/promise" {
  import type { Rule, RuleError } from "markdownlint-cli2/markdownlint";
  export const lint: (options: {
    strings: Record<string, string>;
    customRules: Rule[];
    config: Record<string, unknown>;
  }) => Promise<Record<string, RuleError[]>>;
}
