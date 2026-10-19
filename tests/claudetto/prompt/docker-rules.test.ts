// The Docker forms that mount a host path or give host rights ask the user, and the other forms pass (design D43).
// A command is a string that no test runs.

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { matchingRules } from "../../support/bash-rules.ts";

const ask = (SNIPPET as { permissions: { ask: string[] } }).permissions.ask;
const RULES = ask.filter((rule) => rule.startsWith("Bash(docker "));
const matched = (command: string) => matchingRules(RULES, command).length > 0;

test("a Docker run, create, or compose form with a mount or `--privileged` asks", () => {
  const forms = [
    "docker run -v /:/host alpine",
    "docker run --rm -it --volume /etc:/e alpine sh",
    "docker run --mount type=bind,src=/,dst=/h alpine",
    "docker run --privileged alpine",
    "docker create -v ~/.ssh:/s alpine",
    "docker compose run --rm -v /:/h app",
    "docker compose up --privileged",
  ];
  expect(forms.filter((command) => !matched(command))).toStrictEqual([]);
});

test("a Docker form with no mount and no `--privileged` passes", () => {
  const forms = [
    "docker run --rm alpine echo hi",
    "docker compose up -d",
    "docker compose run --rm app test",
    "docker ps",
    "docker build -t x .",
  ];
  expect(forms.filter(matched)).toStrictEqual([]);
});
