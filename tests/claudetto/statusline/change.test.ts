// The change segment: each state of the active MiniSpec change.

import { expect, test } from "bun:test";
import {
  activeChange,
  changeOf,
} from "../../../src/plugins/claudetto/slices/statusline/adapters/change.ts";
import { rowsOf } from "./support.ts";

const ROOT = "/work/claudetto";
const DIR = `${ROOT}/openspec/changes`;

/** A project with the changes in `tree`, a map from a file to its text. A name in `broken` fails to read. */
const project = (tree: Record<string, string>, broken: string[] = []) => ({
  read: async (file: string) => {
    if (broken.includes(file)) throw new Error(`EACCES: ${file}`);
    return tree[file] ?? null;
  },
  list: async (dir: string) =>
    dir === DIR
      ? [
          ...new Set(
            Object.keys(tree).map(
              (f) => f.slice(DIR.length + 1).split("/")[0] ?? "",
            ),
          ),
        ]
      : [],
});

const TASKS =
  "- [x] 1.1 first\n- [x] 1.2 second\n- [ ] 2.1 third\n- [ ] 2.2 fourth\n";

test("a change with open tasks shows the count and the next task", async () => {
  const { text } = await rowsOf(
    {},
    { files: project({ [`${DIR}/add-login/tasks.md`]: TASKS }) },
  );
  expect(text).toContain("◆ add-login 2/4 ▸2.1");
});

test("a change with a proposal and no task is in planning", async () => {
  const { text } = await rowsOf(
    {},
    { files: project({ [`${DIR}/add-login/proposal.md`]: "why" }) },
  );
  expect(text).toContain("◆ add-login planning");
});

test("a change whose tasks are all done shows the check mark", async () => {
  const { text } = await rowsOf(
    {},
    {
      files: project({
        [`${DIR}/add-login/tasks.md`]: "- [x] 1.1 a\n- [x] 1.2 b\n",
      }),
    },
  );
  expect(text).toContain("◆ add-login 2/2 ✓");
});

test("a change whose tasks cannot be read shows the error mark, and the cause goes to stderr", async () => {
  const file = `${DIR}/add-login/tasks.md`;
  const { text, run } = await rowsOf(
    {},
    { files: project({ [file]: TASKS }, [file]) },
  );
  expect(text).toContain("◆ add-login ✗");
  expect(run.err.join("")).toContain("EACCES");
});

test("a project with no change shows no change segment", async () => {
  const { text } = await rowsOf({});
  expect(text).not.toContain("◆");
});

test("the active change is the first one with an open task, and the archive is skipped", async () => {
  const errors: string[] = [];
  const change = await activeChange(
    ROOT,
    project({
      [`${DIR}/a-done/tasks.md`]: "- [x] 1.1 a\n",
      [`${DIR}/b-open/tasks.md`]: TASKS,
      [`${DIR}/archive/c-old/tasks.md`]: TASKS,
    }),
    (e) => errors.push(e),
  );
  expect(change).toStrictEqual({
    name: "b-open",
    state: "open",
    done: 2,
    total: 4,
    next: "2.1",
  });
  expect(errors).toStrictEqual([]);
});

test("`changeOf` counts only the lines that start with a task box", () => {
  expect(
    changeOf("x", "text\n  - [ ] 9.9 nested\n- [ ] 1.1 a\n"),
  ).toStrictEqual({
    name: "x",
    state: "open",
    done: 0,
    total: 1,
    next: "1.1",
  });
});

test("the next task is the first open task after the last checked task, so a change that starts at group 2 shows its progress", () => {
  const tasks =
    "- [ ] 1.1 a\n- [ ] 1.2 b\n- [x] 2.1 c\n- [x] 2.2 d\n- [ ] 2.3 e\n- [ ] 3.1 f\n";
  expect(changeOf("x", tasks)).toMatchObject({ done: 2, next: "2.3" });
});

test("when no open task follows the last checked task, the next task is the first open task", () => {
  const tasks = "- [ ] 1.1 a\n- [ ] 1.2 b\n- [x] 2.1 c\n";
  expect(changeOf("x", tasks)).toMatchObject({ done: 1, next: "1.1" });
});
