// The files and the dialog that the starter parts need. A closure over `$` stands in for each, because the hook loader takes `$` into a helper only within the file that defines it.

export interface StarterIo {
	cwd(): Promise<string>;
	/** The non-blank lines `git` prints for `args` in the folder, or none when `git` fails. */
	git(args: readonly string[]): Promise<string[]>;
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string | undefined>;
	write(path: string, text: string): Promise<void>;
	/** The option picked, `Write` or `Skip`; it throws when the question is dismissed. */
	ask(question: string, header: string): Promise<string>;
}

export const WRITE = "Write";
