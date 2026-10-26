// The type contract of the `$.state` values of the plugin (`plugin.json`, key `types`).
// A contract has no import, so the shape of `told` is the same as `Told` in `modules/session/hygiene/domain/ledger.ts`.

declare module "claude-code" {
  interface PluginState {
    claudetto: {
      /** The hash of each file for which this session got a line that it changed after the last edit of its agent, by path. The edit ledger itself is a file in the temp folder. */
      told: { [path: string]: string };
      /** The pending note of `finish`, in the shape of `Note` in `modules/work/domain/notes.ts`. The slice `notes` takes it and shows it. */
      note: { tag: string; line: string; explain: string } | null;
      /** The counters and the shown note of the slice `notes`, in the shape of `Notes` in `modules/work/notes/domain/counters.ts`. */
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
      /** The commits that git had before the first `Bash` call of the session, under the id `session`: the ones that `HEAD`, the stash, or a ref pointed to, where each remote-tracking ref pointed, the URL of each remote, the stamp of the settings that `git ls-remote` reads, and whether the session got the line for no commits. Empty with no git repo. */
      bashKnown: StateFamily<
        | {
            commits: string[];
            remotes: { [ref: string]: string };
            urls: { [remote: string]: string };
            told?: boolean;
            opaque?: string[];
            stamps?: { [source: string]: string };
            git?: string;
          }
        | undefined
      >;
      /** The protected files before one `Bash` call, by path, for each `tool_use_id`: where the file really is, and its text. The rule `work.bash-undo` empties the member after the call. */
      bashSaved: StateFamily<{
        [path: string]: { real: string; text: string };
      }>;
      /** The re-blocks of the `/goal` stop in a row, for the cap of `modules/work/finish/limits.ts`. */
      goalBlocks: number;
      /** The re-blocks of the stop for an open task of a `tasks.md` in a row, for the same cap. */
      loopBlocks: number;
      /** The running `Monitor` tasks by command, in the shape of `Watches` in `modules/gate/domain/monitors.ts`. */
      watches: { [command: string]: { id: string; until: number } };
      /** The values that the env files held, by slow salted hash (`ENV_SLOW_ROUNDS` rounds of SHA-256 over the salt and the value), in the shape of `Hashed` in `modules/gate/secrets/domain/hashes.ts`: the length, the key, and the rolling hash of the first characters of each value, and no value. The record under the id `salt` holds the salt of the install as its `key`. */
      envHashes: { [hash: string]: { key: string; len: number; head: number } };
      /** The tool calls of each running subagent by `agent_id`, in the shape of `Calls` in `modules/session/prompt/domain/turns.ts`, for the soft turn limit. */
      calls: { [agentId: string]: number };
      /** The usage of the plan, in the shape of `Usage` in `modules/session/domain/usage.ts`: the last band of each window, the first share of each window, and the usage line that waits for the next request. */
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
