// The contract of `claudetto-sessions`: the `$.state` values of the session, which `claude plugin validate` reads.
// The values last for one session, so a new session can warn again.

declare module "claude-code" {
  interface PluginState {
    "claudetto-sessions": {
      /** The note for the main agent about the weekly limit, until its next tool result carries it. `null` when none waits. */
      note: string | null;
      /** True when the session already made the note, so that it makes one note at most. */
      warned: boolean;
    };
  }
}
