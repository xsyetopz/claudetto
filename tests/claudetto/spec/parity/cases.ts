// The cases of the parity test, with the differences from OpenSpec that design D10 names.

import type { Run } from "./record.ts";

/** The differences from OpenSpec that design D10 names ("Differences from OpenSpec"), with the reason of each. */
export const DIFFERENCES = {
  "empty-project":
    "`new change` works in a project with no `openspec/` folder, with no copied schema, and writes no `config.yaml`",
  "task-lines":
    "A task is a line that starts with `- [ ]` or `- [x]`, as in `countTasks`",
  messages: "The text of an error differs, and the exit code is the same",
  "no-tip":
    "The message for a change with no delta leaves out the tip about `openspec change show`",
} as const;

export type Difference = keyof typeof DIFFERENCES;

export type Case = {
  name: string;
  args: string[];
  empty?: boolean;
  overlays?: string[];
  /** `false` when only the exit code and the files are compared, because the error texts differ. */
  text?: boolean;
  differences?: Difference[];
  /** The record that `minispec` gives, from the projection of the OpenSpec record, when the case has a difference. */
  expected?: (openspecProjection: Run) => Run;
};

export const CASES: Case[] = [
  {
    name: "new change in a project with no openspec folder",
    args: ["new", "change", "add-thing", "--schema", "story"],
    empty: true,
    differences: ["empty-project"],
    expected: () => ({
      code: 0,
      facts: [
        "Created change 'add-thing' at openspec/changes/add-thing/",
        "Schema: story",
      ],
      written: {
        "openspec/changes/add-thing/.openspec.yaml":
          "schema: story\ncreated: <date>\n",
      },
      removed: [],
    }),
  },
  {
    name: "new change",
    args: ["new", "change", "add-thing", "--schema", "story"],
  },
  {
    name: "new change with the task preset",
    args: ["new", "change", "fix-thing", "--schema", "task"],
  },
  {
    name: "new change with a bad name",
    args: ["new", "change", "Add_Thing", "--schema", "story"],
    text: false,
    differences: ["messages"],
  },
  {
    name: "new change that exists",
    args: ["new", "change", "add-greeting-name", "--schema", "story"],
    text: false,
    differences: ["messages"],
  },
  {
    name: "new change with an unknown schema",
    args: ["new", "change", "add-thing", "--schema", "nope"],
    text: false,
    differences: ["messages"],
  },
  { name: "list", args: ["list", "--json"] },
  {
    name: "list with tasks that the line rule reads differently",
    args: ["list", "--json"],
    overlays: ["odd-tasks"],
    differences: ["task-lines"],
    expected: (os) => ({
      ...os,
      facts: os.facts.map((c: { name: string }) =>
        c.name === "odd-tasks"
          ? { ...c, completedTasks: 0, totalTasks: 1, status: "in-progress" }
          : c,
      ),
    }),
  },
  {
    name: "status of the task sample",
    args: ["status", "--change", "fix-greeting-typo", "--json"],
  },
  {
    name: "status of the story sample",
    args: ["status", "--change", "add-greeting-name", "--json"],
  },
  {
    name: "status of the epic sample",
    args: ["status", "--change", "build-greeter", "--json"],
  },
  {
    name: "status of a change with a missing artifact",
    args: ["status", "--change", "bad-scenario", "--json"],
  },
  {
    name: "status of an unknown change",
    args: ["status", "--change", "nope", "--json"],
    text: false,
    differences: ["messages"],
  },
  {
    name: "validate of the story sample",
    args: ["validate", "add-greeting-name", "--json"],
  },
  {
    name: "validate of the task sample",
    args: ["validate", "fix-greeting-typo", "--json"],
  },
  {
    name: "validate of the epic sample with --strict",
    args: ["validate", "build-greeter", "--strict", "--json"],
  },
  {
    name: "validate of a requirement with no scenario",
    args: ["validate", "bad-scenario", "--json"],
  },
  {
    name: "validate of a requirement with no SHALL",
    args: ["validate", "no-shall", "--json"],
    overlays: ["no-shall"],
  },
  {
    name: "validate of a requirement with no SHALL with --strict",
    args: ["validate", "no-shall", "--strict", "--json"],
    overlays: ["no-shall"],
  },
  {
    name: "validate of a change with no delta",
    args: ["validate", "odd-tasks", "--json"],
    overlays: ["odd-tasks"],
    differences: ["no-tip"],
    expected: (os) => ({
      ...os,
      facts: {
        ...os.facts,
        items: os.facts.items.map((i: { issues: { message: string }[] }) => ({
          ...i,
          issues: i.issues.map((x) => ({
            ...x,
            message: x.message.replace(/ Tip: .*$/, ""),
          })),
        })),
      },
    }),
  },
  {
    name: "validate of the merge change",
    args: ["validate", "merge-all", "--json"],
    overlays: ["merge"],
  },
  {
    name: "validate of an unknown change",
    args: ["validate", "nope", "--json"],
    text: false,
    differences: ["messages"],
  },
  {
    name: "archive of the story sample",
    args: ["archive", "add-greeting-name", "--yes"],
  },
  {
    name: "archive of a change with each kind of delta",
    args: ["archive", "merge-all", "--yes"],
    overlays: ["merge"],
  },
  {
    name: "archive of a change that does not validate",
    args: ["archive", "bad-scenario", "--yes"],
    text: false,
    differences: ["messages"],
  },
  {
    name: "archive of a change that modifies a missing spec",
    args: ["archive", "missing-target", "--yes"],
    overlays: ["missing-target"],
    text: false,
    differences: ["messages"],
  },
  {
    name: "archive of an unknown change",
    args: ["archive", "nope", "--yes"],
    text: false,
    differences: ["messages"],
  },
];
