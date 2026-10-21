// The docker-run rule (task 3.3 of `0-2-0`) with commands as strings.
// No command runs.

import { expect, test } from "bun:test";
import {
  DOCKER_VERBS,
  dockerRun,
} from "../../../plugins/claudetto/slices/guard/domain/docker.ts";
import corpus from "./corpus/docker.json" with { type: "json" };

test("each docker call of the corpus that runs or creates a container is found", () => {
  expect(
    corpus.match.filter((command) => dockerRun(command) === null),
  ).toStrictEqual([]);
});

test("no safe form of the corpus is found", () => {
  expect(
    corpus.pass.filter((command) => dockerRun(command) !== null),
  ).toStrictEqual([]);
});

test("the rule gives the verb", () => {
  expect(dockerRun("docker -H x run -v /:/h alpine")).toBe("run");
  expect(dockerRun("docker compose -p p up")).toBe("compose up");
  expect(dockerRun("docker --context c container create x")).toBe(
    "container create",
  );
});

test("the verbs are the verbs of the `DOCKER_ASK` rules of the `prompt` slice", async () => {
  const { DOCKER_ASK } = await import(
    "../../../plugins/claudetto/slices/prompt/domain/docker-ask.ts"
  );
  const commands = new Set(
    DOCKER_ASK.map((rule) =>
      /^Bash\((docker [a-z ]+?)\*/.exec(rule)?.[1]?.trim(),
    ),
  );
  expect([...commands].sort()).toStrictEqual(
    DOCKER_VERBS.map((verb) => `docker ${verb}`).sort(),
  );
});
