import type { Facts, Verdict } from "../gate.ts";
import { pathOf } from "../paths.ts";
import * as T from "../prompts.ts";
import { nameOf, wordSet } from "../shell/shellkinds.ts";
import { verdict } from "./finding.ts";

const DATA_OPTS = wordSet(
	"-d -F --data --data-binary --data-ascii --data-urlencode --form --json",
);
const FILE_OPTS = wordSet("-T --upload-file");
const FILE_VALUE = /^(?:[^=@<]*=)?[@<](.+)$/;
const JOINED = /^(?:-[dF]|--(?:data[\w-]*|form|json)=)(?:[^=@<]*=)?[@<](.+)$/;
const URL_HOST = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/@]*@)?(\[[^\]]+\]|[^/:?#]+)/i;
const LOCAL_HOST = /^(?:localhost|127(?:\.\d+){3}|\[::1\]|[^.]+\.local)$/i;

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

const toRemote = (rest: string[]): boolean =>
	rest.some((w) => {
		const host = URL_HOST.exec(w)?.[1];
		return host !== undefined && !LOCAL_HOST.test(host);
	});

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
