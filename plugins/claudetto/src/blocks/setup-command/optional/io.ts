// What the install step needs. A closure over `$` stands in for each, because the hook loader takes `$` into a helper only within the file that defines it.

export interface ToolsIo {
	/** The output of `uname` with `-s` or `-m`, or an empty text when it fails. */
	uname(flag: "-s" | "-m"): Promise<string>;
	path(): Promise<string | undefined>;
	exists(path: string): Promise<boolean>;
	/** Records the pinned version of a tool whose install was declined, so the launch notice stays quiet. */
	decline(key: string, version: string): Promise<void>;
	/** The option picked, `Yes` or `No`; it throws when the question is dismissed. */
	ask(question: string, header: string): Promise<string>;
	run(argv: readonly string[]): Promise<{ exitCode: number; text: string }>;
}

export const YES = "Yes";
export const NO = "No";
