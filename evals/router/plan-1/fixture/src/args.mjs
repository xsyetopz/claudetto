// The flags of the CLI. Each flag sets the option of the same name.
export const FLAGS = { "--verbose": "verbose" };

export function parseArgs(argv) {
  const opts = {};
  for (const a of argv) if (FLAGS[a]) opts[FLAGS[a]] = true;
  return opts;
}
