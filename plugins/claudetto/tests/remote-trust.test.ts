// Lab tests of the `work.bash-*` hooks: the trust of a remote, of `ssh` and `git` settings, and of the programs that `PATH` names (task 19.12).

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	GLOBAL,
	LOCAL,
	SSH_CONFIG,
	setConfig,
	setUrl,
	type World,
} from "./stubs/git-world.ts";
import {
	after,
	aliased,
	before,
	evilVia,
	FETCHED,
	GH,
	listed,
	NEW,
	OLD,
	OPEN,
	overSsh,
	REAL,
	remoteMoved,
	repo,
	SSH_URL,
	serve,
	stub,
	TASKS,
	TICKED,
} from "./stubs/protect.ts";

test("Aliased Url: a tick from a ref that a remote with an `insteadOf` URL got stays when the config is as it was", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => serve(w, GH, FETCHED), aliased);
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Rewritten Url: a tick is undone when the call set `url.<base>.insteadOf` for the pinned URL to a repo of its own, as `git remote -v` does not show it", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			setConfig(w, LOCAL, "url.file:///tmp/evil.insteadof", GH);
			serve(w, "file:///tmp/evil", FETCHED);
		},
		aliased,
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Url: a tick from a ref that an `ssh` remote got stays when the config is as it was", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => serve(w, SSH_URL, FETCHED),
		overSsh,
	);
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Ssh Command: a tick is undone when the call set `core.sshCommand` to a script that serves its own repo", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			setConfig(w, LOCAL, "core.sshcommand", "evil");
			evilVia(w, "evil");
		},
		overSsh,
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Global Ssh Command: a tick is undone when the call set `core.sshCommand` in the global config", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			setConfig(w, GLOBAL, "core.sshcommand", "evil");
			evilVia(w, "evil");
		},
		overSsh,
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Config: a tick is undone when the call wrote a `ProxyCommand` in `~/.ssh/config`", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			w.files[SSH_CONFIG] = "Host *\n  ProxyCommand evil\n";
			evilVia(w, "evil");
		},
		overSsh,
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Env: a tick is undone when `GIT_SSH_COMMAND` changed after the first call", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			w.env["GIT_SSH_COMMAND"] = "evil";
			evilVia(w, "evil");
		},
		overSsh,
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Include: a tick from an `ssh` remote is undone when `~/.ssh/config` has an `Include` line, which the code cannot read", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => serve(w, SSH_URL, FETCHED),
		(w) => {
			overSsh(w);
			w.files[SSH_CONFIG] = "Include conf.d/*\n";
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Include Https: an `Include` line in `~/.ssh/config` does not stop the trust of an `https` remote", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => serve(w, REAL, FETCHED),
		(w) => {
			w.files[SSH_CONFIG] = "Include conf.d/*\n";
		},
	);
	expect(world.files[TASKS]).toBe(TICKED);
});

/** The call writes `lines` to the config, which `git remote -v` does not show. */
const NOT_READ = [
	"branch.feat.remote=origin",
	"branch.feat.merge=refs/heads/feat",
	"submodule.lib.url=https://h.invalid/lib.git",
	"submodule.lib.active=true",
];

test("Branch Config: a tick from a fetched ref stays when the call only added the keys that `git ls-remote` never reads, such as `branch.<n>.merge` after `git push -u`", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => {
		serve(w, REAL, FETCHED);
		for (const line of NOT_READ) {
			const at = line.indexOf("=");
			setConfig(w, LOCAL, line.slice(0, at), line.slice(at + 1));
		}
	});
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Read Key: a tick is undone when the call added a key that `git ls-remote` reads, here `http.proxy`", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => {
		serve(w, REAL, FETCHED);
		setConfig(w, LOCAL, "http.proxy", "http://evil.invalid:3128");
	});
	expect(world.files[TASKS]).toBe(OPEN);
});

/** The ssh remote with a program that the pinned settings name: the call rewrites the program, so the text of every setting is as it was, and `git ls-remote` gets a fake advertisement. */
const programRewritten =
	(setup: (world: World) => void, program: string) =>
	async ($: Engine, on: On) => {
		const world = await remoteMoved(
			$,
			on,
			(w) => evilVia(w, program),
			(w) => {
				overSsh(w);
				setup(w);
			},
		);
		expect(world.files[TASKS]).toBe(OPEN);
	};

test(
	"Pinned Ssh Command: a tick is undone when `core.sshCommand` names a script at the pin, which the call rewrites",
	programRewritten(
		(w) => setConfig(w, LOCAL, "core.sshcommand", "evil"),
		"evil",
	),
);

test(
	"Pinned Ssh Env: a tick is undone when `GIT_SSH_COMMAND` names a script at the pin",
	programRewritten((w) => {
		w.env["GIT_SSH_COMMAND"] = "evil";
	}, "evil"),
);

test(
	"Pinned Git Ssh: a tick is undone when `GIT_SSH` names a program at the pin",
	programRewritten((w) => {
		w.env["GIT_SSH"] = "/home/u/wrap.sh";
	}, "/home/u/wrap.sh"),
);

for (const keyword of [
	"ProxyCommand",
	"ProxyJump",
	"LocalCommand",
	"KnownHostsCommand",
]) {
	test(
		`Pinned ${keyword}: a tick is undone when \`~/.ssh/config\` has a \`${keyword}\` line at the pin`,
		programRewritten((w) => {
			w.files[SSH_CONFIG] = `Host *\n  ${keyword} evil\n`;
		}, "evil"),
	);
}

test("Pinned Git Proxy: a tick from a `git://` remote is undone when `core.gitProxy` names a program at the pin", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => evilVia(w, "evil"),
		(w) => {
			setUrl(w, "origin", "git://h.invalid/x/y");
			serve(w, "git://h.invalid/x/y", OLD);
			setConfig(w, LOCAL, "core.gitproxy", "evil");
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Plain Ssh Command: a tick from an `ssh` remote stays when `core.sshCommand` is `ssh` with a key file, as it names no other program", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => serve(w, SSH_URL, FETCHED),
		(w) => {
			overSsh(w);
			setConfig(w, LOCAL, "core.sshcommand", "ssh -i ~/.ssh/key");
		},
	);
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Https Helpers: a tick from an `https` remote stays when a credential helper and `core.askPass` are set, as they cannot change the refs", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => serve(w, REAL, FETCHED),
		(w) => {
			setConfig(w, LOCAL, "credential.helper", "!evil");
			setConfig(w, LOCAL, "core.askpass", "/home/u/ask.sh");
			w.env["GIT_ASKPASS"] = "/home/u/ask.sh";
		},
	);
	expect(world.files[TASKS]).toBe(TICKED);
});

const FAKE_SSH = "/home/u/bin/ssh";

test("Fake Ssh: a tick from an `ssh` remote is undone when an `ssh` earlier in `PATH` appeared after the pin", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			w.bin.ssh = FAKE_SSH;
			w.servers[`via:bin:${FAKE_SSH}`] = { "refs/heads/main": FETCHED };
		},
		overSsh,
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Fake Git: a tick from an `https` remote is undone when a `git` earlier in `PATH` appeared after the pin", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => {
		w.bin.git = "/home/u/bin/git";
		w.servers["via:bin:/home/u/bin/git"] = { "refs/heads/main": FETCHED };
	});
	expect(world.files[TASKS]).toBe(OPEN);
});

/** The tick is in a commit from before the session, so a trusted pin keeps it. `setup` runs before the pin, `change` after it and before the call ticks `tasks.md`. */
const trustedTick = async (
	$: Engine,
	on: On,
	setup: (w: World) => void,
	change: (w: World) => void,
) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
		[NEW]: TICKED,
	});
	setup(world);
	await before($);
	change(world);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	return world;
};

test("Same Git: a tick from a commit from before stays when `git` is the same file at the undo", async ($: Engine, on: On) => {
	const world = await trustedTick(
		$,
		on,
		() => undefined,
		() => undefined,
	);
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Fake Git Name: a tick is undone when a `git` earlier in `PATH` appeared after the pin and a run by the name `git` would find it", async ($: Engine, on: On) => {
	const world = await trustedTick(
		$,
		on,
		() => undefined,
		(w) => {
			w.bin.git = "/usr/local/bin/git";
			w.fakeGit = "/usr/local/bin/git";
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Git Gone: a tick is undone when `PATH` has no `git` at the undo", async ($: Engine, on: On) => {
	const world = await trustedTick(
		$,
		on,
		() => undefined,
		(w) => {
			w.bin.git = "";
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Git Overwritten: a tick is undone when the pinned `git` is a file under the home folder that a call overwrote after the pin", async ($: Engine, on: On) => {
	const world = await trustedTick(
		$,
		on,
		(w) => {
			w.bin.git = "/home/u/.local/bin/git";
		},
		(w) => {
			w.fakeGit = "/home/u/.local/bin/git";
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Writable Ssh: a tick from an `ssh` remote is undone when `ssh` is a file under the home folder at the pin, which the call can rewrite", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			w.servers[`via:bin:${FAKE_SSH}`] = { "refs/heads/main": FETCHED };
		},
		(w) => {
			overSsh(w);
			w.bin.ssh = FAKE_SSH;
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Writable Ssh Https: a tick from an `https` remote stays when only `ssh` is under the home folder", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => serve(w, REAL, FETCHED),
		(w) => {
			w.bin.ssh = FAKE_SSH;
		},
	);
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Writable Git: a tick from an `https` remote is undone when `git` is a file under the home folder at the pin", async ($: Engine, on: On) => {
	const world = await remoteMoved(
		$,
		on,
		(w) => {
			w.servers["via:bin:/home/u/bin/git"] = { "refs/heads/main": FETCHED };
		},
		(w) => {
			w.bin.git = "/home/u/bin/git";
		},
	);
	expect(world.files[TASKS]).toBe(OPEN);
});
