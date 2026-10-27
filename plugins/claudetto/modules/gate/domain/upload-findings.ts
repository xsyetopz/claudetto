// The finding of a `curl` that sends a file from outside the project to a remote host: the data of `-d @f`, `-F k=@f`, or `-T f`.

import { nameOf, wordSet } from "../../shell/domain/shellkinds.ts";
import * as T from "../prompts.ts";
import { verdict } from "./finding.ts";
import type { Facts, Verdict } from "./gate.ts";
import { pathOf } from "./paths.ts";

const DATA_OPTS = wordSet(
	"-d -F --data --data-binary --data-ascii --data-urlencode --form --json",
);
const FILE_OPTS = wordSet("-T --upload-file");
/** A value that reads a file: `@f`, `<f`, or `name=@f`. The file is the group. */
const FILE_VALUE = /^(?:[^=@<]*=)?[@<](.+)$/;
/** An option with its value in one word: `-d@f`, `-Fk=@f`, and `--data-binary=@f`. The file is the group. */
const JOINED = /^(?:-[dF]|--(?:data[\w-]*|form|json)=)(?:[^=@<]*=)?[@<](.+)$/;
const URL_HOST = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/@]*@)?(\[[^\]]+\]|[^/:?#]+)/i;
const LOCAL_HOST = /^(?:localhost|127(?:\.\d+){3}|\[::1\]|[^.]+\.local)$/i;

/** The files that the `curl` words `rest` send. */
const sentFiles = (rest: string[]): string[] =>
	rest.flatMap((w, i) => {
		const joined = JOINED.exec(w)?.[1];
		if (joined !== undefined) {
			return [joined];
		}
		if (FILE_OPTS.has(w)) {
			return [rest[i + 1] ?? ""];
		}
		const value = DATA_OPTS.has(w) ? FILE_VALUE.exec(rest[i + 1] ?? "") : null;
		return value?.[1] === undefined ? [] : [value[1]];
	});

/** True when a URL of `rest` has a host that is not the machine of the user. */
const toRemote = (rest: string[]): boolean =>
	rest.some((w) => {
		const host = URL_HOST.exec(w)?.[1];
		return host !== undefined && !LOCAL_HOST.test(host);
	});

/** An `ask` for a `curl` that sends a file from outside the project to a remote host, because the file leaves the machine. A file in the project is the work of the user, and the secret gates cover the files that hold secrets. */
export const uploadFinding = (
	rest: string[],
	dir: string | null,
	f: Facts,
): Verdict | undefined =>
	nameOf(rest) === "curl" &&
	toRemote(rest) &&
	sentFiles(rest).some((file) => {
		const path = dir === null ? null : pathOf(dir, file, f);
		return path !== null && path !== f.cwd && !path.startsWith(`${f.cwd}/`);
	})
		? verdict("ask", T.ASK_UPLOAD)
		: undefined;
