// The type contract of the `$.state` values of the plugin (`plugin.json`, key `types`).
// A contract has no import, so the shape of `told` is the same as `Told` in `slices/hygiene/domain/ledger.ts`.

declare module "claude-code" {
  interface PluginState {
    claudetto: {
      /** The hash of each file for which this session got a line that it changed after the last edit of its agent, by path. The edit ledger itself is a file in the temp folder. */
      told: { [path: string]: string };
      /** The pending note of `finish`, in the shape of `Note` in `kernel/notes.ts`. The slice `notes` takes it and shows it. */
      note: { tag: string; line: string; explain: string } | null;
      /** The counters and the shown note of the slice `notes`, in the shape of `Notes` in `slices/notes/domain/counters.ts`. */
      notes: {
        isOff: boolean;
        shown: {
          tag: string;
          line: string;
          explain: string;
          left: number;
        } | null;
        recent: string[];
        ignored: number;
        skip: number;
        seen: { [id: string]: { at: number; told: boolean } };
        asks: { [rule: string]: number };
        fails: { [command: string]: { count: number; sign: string } };
      };
      /** The re-blocks of the `/goal` stop in a row, for the cap of `slices/finish/limits.ts`. */
      goalBlocks: number;
      /** The re-blocks of the stop for an open task of a `tasks.md` in a row, for the same cap. */
      loopBlocks: number;
      /** The running `Monitor` tasks by command, in the shape of `Watches` in `slices/guard/domain/monitors.ts`. */
      watches: { [command: string]: { id: string; until: number } };
      /** The usage of the plan, in the shape of `Usage` in `kernel/usage.ts`: the last band of each window, the first share of each window, and the usage line that waits for the next request. */
      usage: {
        bands: {
          five_hour?: "green" | "amber" | "red";
          seven_day?: "green" | "amber" | "red";
        };
        start: { five_hour?: number; seven_day?: number };
        line?: string;
      };
    };
  }
}
