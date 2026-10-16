// The GitHub writes of network clients (`domain/net.ts`), and their effect on `actionsOf`.

import { expect, test } from "bun:test";
import { actionsOf } from "../../../src/plugins/claudetto/slices/policy/domain/actions.ts";
import { netOf } from "../../../src/plugins/claudetto/slices/policy/domain/net.ts";

const net = (head: string, line: string) => netOf(head, line.split(" "));

test("`curl` with a method other than `GET`, or with a body, is a write", () => {
  for (const line of [
    "curl -X POST https://api.github.com/repos/them/app/issues",
    "curl -XPUT https://api.github.com/repos/them/app/x",
    "curl --request DELETE https://api.github.com/repos/them/app/x",
    "curl --request=PATCH https://api.github.com/repos/them/app/x",
    "curl -d x https://api.github.com/repos/them/app/issues",
    "curl -sSd x https://api.github.com/repos/them/app/issues",
    "curl --data-binary @f https://api.github.com/repos/them/app/x",
    "curl --data-raw x https://api.github.com/repos/them/app/x",
    "curl --json x https://api.github.com/repos/them/app/x",
    "curl -F a=b https://uploads.github.com/repos/them/app/releases/1/assets",
    "curl --form a=b https://api.github.com/repos/them/app/x",
    "curl -T f https://uploads.github.com/repos/them/app/x",
    "curl --upload-file f https://api.github.com/repos/them/app/x",
  ])
    expect(net("curl", line)?.write, line).toBe(true);
});

test("`curl` with no write flag is a read, also with an `Authorization` header", () => {
  for (const line of [
    "curl https://api.github.com/repos/them/app/issues",
    "curl -s -X GET https://api.github.com/repos/them/app/issues",
    "curl -sSL -H Authorization:token https://api.github.com/repos/them/app",
    "curl -I https://github.com/them/app",
  ]) {
    const n = net("curl", line);
    expect(n?.write, line).toBe(false);
    expect(n?.repos, line).toEqual(["them/app"]);
  }
});

test("the repository comes from the path of each GitHub host", () => {
  expect(
    net("curl", "curl -d x https://api.github.com/repos/o/n/issues")?.repos,
  ).toEqual(["o/n"]);
  expect(
    net(
      "curl",
      "curl -d x https://uploads.github.com/repos/o/n/releases/1/assets",
    )?.repos,
  ).toEqual(["o/n"]);
  expect(net("curl", "curl -d x https://github.com/o/n/issues")?.repos).toEqual(
    ["o/n"],
  );
  expect(
    net("curl", "curl -d x api.github.com/repos/o/n/issues")?.repos,
  ).toEqual(["o/n"]);
  expect(
    net("curl", "curl -d x https://x:y@api.github.com:443/repos/o/n")?.repos,
  ).toEqual(["o/n"]);
  expect(net("curl", "curl -d x https://example.com/repos/o/n")?.repos).toEqual(
    [],
  );
});

test("a GitHub URL with no repository, or a URL that a shell expands, is unclear", () => {
  expect(net("curl", "curl -d x https://api.github.com/graphql")?.unclear).toBe(
    true,
  );
  expect(
    net("curl", "curl -d x https://api.github.com/user/repos")?.unclear,
  ).toBe(true);
  expect(net("curl", "curl -d x $URL")?.unclear).toBe(true);
  expect(net("curl", "curl -d x https://$HOST/a")?.unclear).toBe(true);
  expect(
    net("curl", "curl -d x https://api.github.com/repos/$O/$R/issues")?.unclear,
  ).toBe(true);
  expect(net("curl", "curl -d x https://example.com/$X")?.unclear).toBe(false);
});

test("a value of a flag is not a URL", () => {
  expect(
    net("curl", "curl -H X-A:$TOKEN -d $BODY https://api.github.com/repos/o/n"),
  ).toMatchObject({ unclear: false, repos: ["o/n"] });
});

test("`wget` with a post flag or a method is a write", () => {
  for (const line of [
    "wget --post-data=x https://api.github.com/repos/o/n/issues",
    "wget --post-file f https://api.github.com/repos/o/n/issues",
    "wget --method=PUT https://api.github.com/repos/o/n/x",
    "wget --method DELETE https://api.github.com/repos/o/n/x",
    "wget --body-data=x --method=POST https://api.github.com/repos/o/n/x",
  ])
    expect(net("wget", line)?.write, line).toBe(true);
  expect(
    net("wget", "wget https://github.com/o/n/archive/main.zip")?.write,
  ).toBe(false);
});

test("`http` and `xh` write with a method, a body item, or open stdin", () => {
  for (const line of [
    "http POST api.github.com/repos/o/n/issues title=x",
    "xh PUT https://api.github.com/repos/o/n/x",
    "http --ignore-stdin api.github.com/repos/o/n/issues title=x",
    "http -I api.github.com/repos/o/n/issues title:=1",
    "http api.github.com/repos/o/n/x",
  ])
    expect(net(line.split(" ")[0] as string, line)?.write, line).toBe(true);
  for (const line of [
    "http --ignore-stdin api.github.com/repos/o/n/issues",
    "xh -I GET https://api.github.com/repos/o/n/issues q==x",
  ])
    expect(net(line.split(" ")[0] as string, line)?.write, line).toBe(false);
});

test("a program that is not a client has no net use", () => {
  expect(net("cat", "cat x")).toBeUndefined();
});

test("a `curl` write to a GitHub repository is an action with that repository", () => {
  const [a] = actionsOf(
    "curl -X POST https://api.github.com/repos/them/app/issues -d x",
  );
  expect(a).toEqual({ kind: "net", repos: ["them/app"], unclear: false });
  expect(
    actionsOf("curl https://api.github.com/repos/them/app/issues"),
  ).toEqual([]);
  expect(
    actionsOf("curl -d x https://api.github.com/repos/$O/$R")[0],
  ).toMatchObject({ kind: "net", unclear: true });
});
