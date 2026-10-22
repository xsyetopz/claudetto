// The type contract of the `$.state` values of the plugin (`plugin.json`, key `types`).
// A contract has no import, so the shape of `ledger` is the same as `Ledger` in `slices/hygiene/domain/ledger.ts`.

declare module "claude-code" {
  interface PluginState {
    claudetto: {
      /** The edit ledger of spec `session-hygiene`: one entry for each file that an agent edited, by path. */
      ledger: {
        [path: string]: {
          /** The 64-bit hash of the file content after the last edit of the agent, in hex. */
          hash: string;
          /** The name of the agent that made that edit. */
          agent: string;
          /** The hash for which the agent got a line already, so a change gets one line. */
          told?: string;
        };
      };
    };
  }
}
