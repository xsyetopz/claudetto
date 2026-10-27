// The note that `finish` writes to the `$.state` key `note` and `notes` shows. No import.

/** The tag and the line show above the prompt, and the explanation goes into the prompt box on the insert key. */
export interface Note {
	readonly tag: string;
	readonly line: string;
	readonly explain: string;
}
