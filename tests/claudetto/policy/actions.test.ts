// The actions that `actionsOf` reads from a `Bash` command (`domain/actions.ts`).
// Only an action that reaches an upstream repository, or the verdict store, makes an action.
// The commands are strings for the reader. No test runs one.

import { expect, test } from "bun:test";
import {
  type Action,
  actionsOf,
} from "../../../src/plugins/claudetto/slices/policy/domain/actions.ts";

const of = <K extends Action["kind"]>(command: string, kind: K) =>
  actionsOf(command).filter(
    (a): a is Extract<Action, { kind: K }> => a.kind === kind,
  );
const none = (command: string) =>
  expect(actionsOf(command), command).toEqual([]);
const some = (command: string) =>
  expect(actionsOf(command).length, command).toBeGreaterThan(0);

test("local commands make no action, in any checkout", () => {
  for (const c of [
    "cat a.txt",
    "make",
    "bun test",
    "npm install",
    "sed -i s/a/b/ f",
    "touch x",
    "rm x",
    "python3 -c 'print(1)'",
    "git commit -m x",
    "git add .",
    "git fetch",
    "git checkout -b x",
    "git branch -D x",
    "git stash",
    "git log --output=out",
    "echo x > out.txt",
    "echo x >> a/b",
    "echo x > $OUT",
    "cd /w && cd $X && make",
    "curl -o out https://example.com/a",
    "wget https://github.com/them/app/archive/main.zip",
    "curl https://api.github.com/repos/them/app/issues",
    "gh pr checkout 3",
    "gh repo clone them/app",
    "gh repo fork them/app",
    "gh auth login",
    "gh config set editor vim",
  ])
    none(c);
});

test("`git push` is a `push` action with the folder and the remote", () => {
  expect(actionsOf("git push")).toEqual([
    { kind: "push", dir: undefined, remote: undefined, unknown: false },
  ]);
  expect(of("cd /work/app && git push origin main", "push")[0]).toMatchObject({
    dir: "/work/app",
    remote: "origin",
  });
  expect(of("git -C /work/app push -u fork HEAD", "push")[0]).toMatchObject({
    dir: "/work/app",
    remote: "fork",
  });
  expect(
    of("git push --repo=git@github.com:them/app.git", "push")[0]?.remote,
  ).toBe("git@github.com:them/app.git");
  expect(of("git push -o ci.skip origin", "push")[0]?.remote).toBe("origin");
  expect(of("git push --force-with-lease", "push")[0]?.remote).toBeUndefined();
  expect(of("sudo git push", "push")).toHaveLength(1);
});

test("a folder or remote with a shell expansion makes the `push` unknown", () => {
  expect(of("cd $DIR && git push", "push")[0]?.unknown).toBe(true);
  expect(of("git -C $DIR push", "push")[0]?.unknown).toBe(true);
  expect(of("git push $REMOTE", "push")[0]).toMatchObject({
    unknown: true,
    remote: undefined,
  });
  expect(of("cd /a && cd $X && cd /b && git push", "push")[0]?.unknown).toBe(
    false,
  );
});

test("`gh` reads make no action, and the other groups and verbs do", () => {
  for (const c of [
    "gh pr list",
    "gh issue view 3",
    "gh pr diff 3",
    "gh repo view them/app",
    "gh release list",
    "gh run view 3",
    "gh search repos x",
    "gh status",
    "gh auth status",
    "gh api repos/them/app/issues",
    "gh api -X GET repos/them/app/issues",
  ])
    none(c);
  for (const c of [
    "gh pr create --fill",
    "gh issue comment 3 -b hi",
    "gh release create v1",
    "gh repo delete them/app",
    "gh workflow run x.yml",
    "gh run rerun 3",
    "gh label create x",
    "gh secret set X",
    "gh gist create a",
    "gh api -X POST repos/them/app/issues",
    "gh api repos/them/app/issues -f title=x",
  ])
    expect(of(c, "gh"), c).toHaveLength(1);
});

test("`gh -R` and a `gh api` endpoint name the repository of the action", () => {
  expect(of("gh pr create -R them/app", "gh")[0]?.repo).toBe("them/app");
  expect(of("gh release create v1 --repo them/app", "gh")[0]?.repo).toBe(
    "them/app",
  );
  expect(of("gh api -X PUT repos/them/app/x", "gh")[0]?.repo).toBe("them/app");
  expect(of("cd /w && gh pr create", "gh")[0]).toMatchObject({
    dir: "/w",
    repo: undefined,
  });
  expect(of("cd $D && gh pr create", "gh")[0]?.unknown).toBe(true);
});

test("a network write to GitHub is a `net` action, and a read is not", () => {
  expect(
    actionsOf("curl -X POST -d x https://api.github.com/repos/them/app/issues"),
  ).toEqual([{ kind: "net", repos: ["them/app"], unclear: false }]);
  expect(
    of("curl -X POST https://api.github.com/graphql", "net")[0]?.unclear,
  ).toBe(true);
  none("curl -X POST https://example.com/a");
});

test("a command that names the verdict store is a `store` action", () => {
  for (const c of [
    "cp x.json ~/.claudetto/policy/a.json",
    "echo '{}' > ~/.claudetto/policy/a.json",
    "rm -rf ~/.claudetto/policy",
    "mv a /home/me/.claudetto/policy/b.json",
    "tee /home/me/.claudetto/policy/b.json",
    "sed -i s/a/b/ ~/.claudetto/policy/b.json",
    "rm -rf ~/.claudetto",
    "rm ~/.claudetto/policy/*",
    "python3 /tmp/x.py ~/.claudetto/policy/b.json",
    "cd ~/.claudetto/policy && rm x.json",
    "cd ~/.claudetto && rm -rf policy",
    "cd /tmp && rm ../home/me/.claudetto/policy/x",
    "touch --reference=~/.claudetto/policy/a b",
  ])
    expect(
      actionsOf(c).some((a) => a.kind === "store"),
      c,
    ).toBe(true);
});

test("a read of the verdict store is no action", () => {
  none("cat ~/.claudetto/policy/a.json");
  none("ls ~/.claudetto/policy");
  none("grep forbidden ~/.claudetto/policy/*.json");
});

test("a redirect to the store is a `store` action, and a redirect elsewhere is not", () => {
  expect(actionsOf("echo x > ~/.claudetto/policy/a.json")).toEqual([
    { kind: "store" },
  ]);
  none("echo x > /dev/null");
});

test("a wrapper does not hide the action", () => {
  some("env A=b git push");
  none("sudo cat x");
});
