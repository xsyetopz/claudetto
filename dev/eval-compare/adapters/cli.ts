import { USAGE } from "../prompts.ts";
import { runBoth } from "./eval-both.ts";

export const main = async (argv: string[]): Promise<number> => {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const [a, b, ...rest] = argv;
  if (!a || !b || a.startsWith("-") || b.startsWith("-")) {
    console.error(USAGE);
    return 2;
  }
  return runBoth(a, b, rest);
};
