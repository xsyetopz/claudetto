// The Docker forms that mount a host path or give host rights ask the user, and the other forms pass (design D43).
// A command is a string that no test runs.

import { expect, test } from "bun:test";
import { askMatcher } from "./ask-rules.ts";

const matched = askMatcher("Bash(docker ");

test("a Docker run, create, or compose form with a mount or `--privileged` asks", () => {
  const forms = [
    "docker run -v /:/host alpine",
    "docker run --rm -it --volume /etc:/e alpine sh",
    "docker run --mount type=bind,src=/,dst=/h alpine",
    "docker run --privileged alpine",
    "docker create -v ~/.ssh:/s alpine",
    "docker container run -v /:/host alpine",
    "docker container create --privileged alpine",
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
    "docker container run --rm alpine echo hi",
    "docker ps",
    "docker build -t x .",
  ];
  expect(forms.filter(matched)).toStrictEqual([]);
});
