// The open spec store of one CLI run: the files under one root, with the writes.
// Only this slice writes the store. The reads go through the `FileReader` port of the kernel.

import fs from "node:fs";
import path from "node:path";
import { fileReader } from "../../../../../kernel/node/fs.ts";
import { ARCHIVE_DIR, SPEC_ROOT } from "../../../../../kernel/paths.ts";
import type { FileReader } from "../../../../../kernel/ports.ts";
import {
  eventLine,
  eventsPath,
  isJson,
  packageStates,
  readEvents,
  type StateEvent,
  scanEvents,
} from "../../../../../kernel/spec-store.ts";

/**
 * Prepares `file` for one append, and gives the text that goes before the new line.
 * A torn last line, with no line end and not JSON, is cut off, so the new line does not join it.
 * A last line that is JSON with no line end gets a line end first.
 */
const readyForAppend = async (file: string): Promise<string> => {
  if (!fs.existsSync(file)) return "";
  const bytes = await Bun.file(file).bytes();
  if (bytes.length === 0 || bytes[bytes.length - 1] === 0x0a) return "";
  const cut = bytes.lastIndexOf(0x0a) + 1;
  if (cut > 0 && !isJson(new TextDecoder().decode(bytes.subarray(cut)))) {
    fs.truncateSync(file, cut);
    return "";
  }
  return "\n";
};

/** The store under the folder `root`. Each path that a method takes is relative to `root`. */
export class SpecStore {
  /** The reader of the store: a missing file gives null, and a missing folder gives an empty list. */
  readonly files: FileReader;

  readonly root: string;

  /** The last append for each file, so appends at once run one after the other, in call order. */
  private readonly appends = new Map<string, Promise<void>>();

  constructor(root: string) {
    this.root = root;
    this.files = {
      read: (file) => fileReader.read(this.abs(file)),
      list: (dir) => fileReader.list(this.abs(dir)),
    };
  }

  abs(rel: string): string {
    return path.join(this.root, rel);
  }

  exists(rel: string): boolean {
    return fs.existsSync(this.abs(rel));
  }

  async write(rel: string, text: string): Promise<void> {
    await Bun.write(this.abs(rel), text);
  }

  /** The state events of the change `id`, or `null`. It throws an `Error` on a `schema` that it does not know. */
  events(id: string): Promise<readonly StateEvent[] | null> {
    return readEvents(this.files, id);
  }

  /** The states of the packages of the change `id`: the package files and the last lines of `events`, from `packageStates`. */
  states(
    id: string,
    events: readonly StateEvent[],
  ): Promise<Record<string, string>> {
    return packageStates(this.files, id, events);
  }

  /** The line of the torn last line of `events.jsonl` of the change `id`, or `null` when there is none. */
  async tornLine(id: string): Promise<number | null> {
    return (await scanEvents(this.files, id))?.torn ?? null;
  }

  /**
   * Adds one line for `event` to the end of `events.jsonl` of the change `id`, with an append.
   * A torn last line is cut off first, and a last line with no line end gets one, so the new line starts on its own line.
   */
  appendEvent(id: string, event: StateEvent): Promise<void> {
    const file = this.abs(eventsPath(id));
    const run = async (): Promise<void> => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const lead = await readyForAppend(file);
      fs.appendFileSync(file, `${lead}${eventLine(event)}`);
    };
    const done = (this.appends.get(file) ?? Promise.resolve()).then(run, run);
    this.appends.set(
      file,
      done.catch(() => undefined),
    );
    return done;
  }

  /** The ids of the open changes, in order. The archive is not a change. */
  async changes(): Promise<string[]> {
    const archive = path.posix.basename(ARCHIVE_DIR);
    const names = await this.files.list(SPEC_ROOT);
    return names
      .filter((name) => name !== archive && !name.startsWith("."))
      .filter((name) =>
        fs.statSync(this.abs(path.posix.join(SPEC_ROOT, name))).isDirectory(),
      )
      .sort();
  }

  /** The `.md` files of a folder, in order. */
  async markdown(dir: string): Promise<string[]> {
    return (await this.files.list(dir)).filter((n) => n.endsWith(".md")).sort();
  }

  /** Makes the folder `rel` and its parents. It throws when a path part is a file. */
  makeDir(rel: string): void {
    fs.mkdirSync(this.abs(rel), { recursive: true });
  }

  copyDir(from: string, to: string): void {
    fs.cpSync(this.abs(from), this.abs(to), { recursive: true });
  }

  remove(rel: string): void {
    fs.rmSync(this.abs(rel), { recursive: true, force: true });
  }

  move(from: string, to: string): void {
    fs.mkdirSync(path.dirname(this.abs(to)), { recursive: true });
    fs.renameSync(this.abs(from), this.abs(to));
  }
}
