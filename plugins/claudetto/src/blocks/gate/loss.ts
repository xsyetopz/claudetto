import { type GitCall, gitHead } from "./shell/git.ts";
import { nameOf, operands, wordSet } from "./shell/shellkinds.ts";
import { baseName } from "./shell/wrappers.ts";

const SQL_DESTRUCTIVE = /\b(?:drop\s+(?:database|schema|table)|truncate)\b/i;
const SQL_DELETE_FROM = /\bdelete\s+from\b/i;
const SQL_WHERE = /\bwhere\b/i;
const DB_FILE_EXTENSION = /\.(?:sqlite3?|db)$/;
const DISK_ERASE_VERB = /^(?:erase|zero|secureErase|partition|reformat)/i;
const PROTECTION_DISABLE_FLAG = /^--(?:master|global)-disable$/;
const NVRAM_FLAG = /^-[dcf]$/;
const MKFS_NAME = /^(?:mkfs(?:\..+)?|newfs.*)$/;
const FIND_EXPRESSION_START = /^[-(!]/;
const SHORT_FLAG_CLUSTER = /^-[A-Za-z]+$/;
const PRUNE_NOW_FLAG = /^--prune=(?:now|all)$/;
const SHORT_FLAG_START = /^-[A-Za-z]/;
const FORCE_PUSH_FLAG = /^--(?:force|force-with-lease|delete|mirror)(?:=|$)/;
const DELETE_REFSPEC = /^[+:]/;
const SQL_CLIENT =
	/^(?:psql|mysql|mariadb|sqlite3|sqlcmd|duckdb|clickhouse-client) /;
const DB_COMMANDS = [
	/^dropdb\b/,
	/^redis-cli\b.*\bflush(?:all|db)\b/i,
	/\bprisma migrate reset\b/,
	/\b(?:rails|rake) db:drop\b/,
];
const INFRA_COMMANDS = [
	/^(?:terraform|tofu) (?:.* )?(?:destroy\b|apply .*-destroy\b)/,
	/^pulumi (?:.* )?destroy\b/,
	/^kubectl (?:.* )?delete (?:namespace|namespaces|ns)\b/,
	/^aws (?:.* )?(?:s3 rb|s3api delete-bucket|ec2 delete-volume|rds delete-db-(?:instance|cluster))\b/,
	/^gcloud (?:.* )?(?:disks|buckets|instances) delete\b/,
	/^gsutil (?:.* )?rb\b/,
	/^gh (?:.* )?(?:repo (?:delete|archive)|(?:release|gist|ssh-key|gpg-key|secret|variable|label|issue|cache|run) delete)\b/,
	/^gh api\b.*(?:-X|--method)[ =]?DELETE\b/i,
	/^az (?:.* )?(?:disk|storage account|storage container|sql db|sql server|cosmosdb) delete\b/,
];

const sqlLoss = (sql: string): boolean =>
	sql
		.split(";")
		.some(
			(s) =>
				SQL_DESTRUCTIVE.test(s) ||
				(SQL_DELETE_FROM.test(s) && !SQL_WHERE.test(s)),
		);

export const lossKind = (rest: string[]): "db" | "infra" | undefined => {
	const line = [nameOf(rest), ...rest.slice(1)].join(" ");
	if (
		(SQL_CLIENT.test(line) && sqlLoss(line)) ||
		DB_COMMANDS.some((re) => re.test(line))
	) {
		return "db";
	}
	return INFRA_COMMANDS.some((re) => re.test(line)) ? "infra" : undefined;
};

export const isDbFile = (path: string): boolean => DB_FILE_EXTENSION.test(path);

export const DELETES = wordSet("rm shred srm unlink");
const FIND_RUNS = wordSet("-exec -execdir -ok -okdir");

const DISK_TESTS: Record<string, (rest: string[], sub: string) => boolean> = {
	dd: (rest) => rest.some((w) => w.startsWith("of=/dev/")),
	diskutil: (_, sub) => DISK_ERASE_VERB.test(sub),
	csrutil: (_, sub) => sub !== "status",
	spctl: (rest) => rest.some((w) => PROTECTION_DISABLE_FLAG.test(w)),
	nvram: (rest) =>
		rest.slice(1).some((w) => w.includes("=") || NVRAM_FLAG.test(w)),
	security: (_, sub) => sub.startsWith("delete-"),
};

export const erasesDisk = (name: string, rest: string[]): boolean =>
	MKFS_NAME.test(name) ||
	(Object.hasOwn(DISK_TESTS, name) &&
		(DISK_TESTS[name]?.(rest, rest[1] ?? "") ?? false));

export const deleteTargets = (rest: string[]): string[] | undefined => {
	const name = nameOf(rest);
	if (DELETES.has(name)) {
		return operands(rest.slice(1));
	}
	const runsDelete = rest.some(
		(w, i) =>
			w === "-delete" ||
			(FIND_RUNS.has(w) && DELETES.has(baseName(rest[i + 1] ?? ""))),
	);
	if (name !== "find" || !runsDelete) {
		return undefined;
	}
	const end = rest.findIndex((w, i) => i > 0 && FIND_EXPRESSION_START.test(w));
	const roots = rest.slice(1, end < 0 ? undefined : end);
	return roots.length > 0 ? roots : ["."];
};

const MOVES = wordSet("mv");
const TARGET_OPT = /^(?:--target-directory(?:=|$)|-[A-Za-z]*t)/;
const TARGET_OPTS = wordSet("-t --target-directory");

export const moveSources = (rest: string[]): string[] | undefined => {
	if (!MOVES.has(nameOf(rest))) {
		return undefined;
	}
	const args = operands(rest.slice(1), TARGET_OPTS);
	return rest.some((w) => TARGET_OPT.test(w)) ? args : args.slice(0, -1);
};

export type GitScope = "changes" | "untracked" | "delete";

export type Loss = { scope: GitScope; paths: string[] } | "always";

const PUSH_VALUE_OPTS = wordSet(
	"--repo --receive-pack --exec --push-option -o",
);

export const gitCall = (argv: string[]): GitCall | undefined => {
	const head = gitHead(argv);
	return head && { dir: head.dir, verb: head.verb, args: head.args };
};

const hasFlag = (args: string[], long: string, short: string): boolean =>
	args.some(
		(a) =>
			a === long || (SHORT_FLAG_CLUSTER.test(a) && a.slice(1).includes(short)),
	);

const changes = (paths: string[] = []): Loss => ({ scope: "changes", paths });

const LOSSES: Record<string, (args: string[]) => Loss | undefined> = {
	reset: (args) => (args.includes("--hard") ? changes() : undefined),
	checkout: (args) => {
		// A branch name is a path with no change, so `git` gives it as clean.
		const paths = operands(args);
		if (hasFlag(args, "--force", "f")) {
			return changes();
		}
		return paths.length > 0 ? changes(paths) : undefined;
	},
	restore: (args) =>
		hasFlag(args, "--staged", "S") && !hasFlag(args, "--worktree", "W")
			? undefined
			: changes(operands(args, wordSet("-s --source --pathspec-from-file"))),
	clean: (args) =>
		!hasFlag(args, "--force", "f") || hasFlag(args, "--dry-run", "n")
			? undefined
			: {
					scope:
						hasFlag(args, "-x", "x") || hasFlag(args, "-X", "X")
							? "delete"
							: "untracked",
					paths: operands(args, wordSet("-e --exclude")),
				},
	stash: (args) =>
		args[0] === "drop" || args[0] === "clear" ? "always" : undefined,
	reflog: (args) => (args[0] === "expire" ? "always" : undefined),
	gc: (args) =>
		args.some((a) => PRUNE_NOW_FLAG.test(a)) ? "always" : undefined,
};

export const localLoss = (call: GitCall): Loss | undefined =>
	Object.hasOwn(LOSSES, call.verb) ? LOSSES[call.verb]?.(call.args) : undefined;

const commitsAll = (args: string[]): boolean => {
	for (const arg of args) {
		switch (arg) {
			case "--":
				return false;
			case "--all":
				return true;
			default:
				if (!SHORT_FLAG_START.test(arg)) {
					continue;
				}
		}
		for (const letter of arg.slice(1)) {
			if (letter === "a") {
				return true;
			}
			if ("mFcCtSu".includes(letter)) {
				break;
			}
		}
	}
	return false;
};

export const bulkStage = (call: GitCall): boolean =>
	call.verb === "add"
		? hasFlag(call.args, "--all", "A") ||
			operands(call.args).some((a) => a === "." || a === "./")
		: call.verb === "commit" && commitsAll(call.args);

const STASH_VALUE_OPTS = wordSet("-m --message --pathspec-from-file");

const namesPath = (
	args: string[],
	least: number,
	valueOpts = new Set<string>(),
): boolean =>
	args.some((a) => a.startsWith("--pathspec-from-file")) ||
	operands(args, valueOpts).length >= (args.includes("--") ? 1 : least);

const stashesTree = (args: string[]): boolean => {
	const [verb] = args;
	switch (verb) {
		case undefined:
			return !namesPath(args, 1, STASH_VALUE_OPTS);
		case "push":
			return !namesPath(args.slice(1), 1, STASH_VALUE_OPTS);
		case "save":
			return true;
		default:
			if (verb.startsWith("-")) {
				return !namesPath(args, 1, STASH_VALUE_OPTS);
			}
	}
	return (
		(verb === "apply" || verb === "pop") &&
		!args.some((a) => a === "--index" || a === "-i")
	);
};

const resetsIndex = (args: string[]): boolean =>
	!args.includes("--hard") && !namesPath(args, 2);

export const wholeTree = (call: GitCall): boolean =>
	call.verb === "stash"
		? stashesTree(call.args)
		: call.verb === "reset" && resetsIndex(call.args);

export const remoteRewrite = ({ verb, args }: GitCall): boolean => {
	if (verb !== "push") {
		return false;
	}
	const plain = operands(args, PUSH_VALUE_OPTS);
	const repo = args.some((a) => a === "--repo" || a.startsWith("--repo="));
	return (
		args.some((a) => FORCE_PUSH_FLAG.test(a)) ||
		hasFlag(args, "--force", "f") ||
		hasFlag(args, "--delete", "d") ||
		(repo ? plain : plain.slice(1)).some((r) => DELETE_REFSPEC.test(r))
	);
};

/** The repository a `git push` names, from `--repo` or its first operand; absent for the default remote. */
export const pushTarget = ({ verb, args }: GitCall): string | undefined => {
	if (verb !== "push") {
		return undefined;
	}
	const at = args.findIndex((a) => a === "--repo" || a.startsWith("--repo="));
	const flag = args[at];
	if (flag !== undefined) {
		return flag === "--repo" ? args[at + 1] : flag.slice("--repo=".length);
	}
	return operands(args, PUSH_VALUE_OPTS)[0];
};
