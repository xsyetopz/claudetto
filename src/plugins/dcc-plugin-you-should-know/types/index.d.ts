// The contract of `dcc-plugin-you-should-know`: the `$.state` values of the session, which `claude plugin validate` reads.
// The values last for one session, so a new session tries the separate call again and can show each topic again.

/** The turn in progress: its id, the prompt of the user, and whether a call of the turn was checked. */
export type YouShouldKnowTurn = {
  id: string;
  prompt: string;
  checked: boolean;
};

/** The model path of the checks: a separate call, or a fork after the separate call got HTTP 429. */
export type YouShouldKnowPath = "complete" | "fork";

declare module "claude-code" {
  interface PluginState {
    "dcc-plugin-you-should-know": {
      turn: YouShouldKnowTurn;
      path: YouShouldKnowPath;
      /** The topics that showed in this session. */
      shown: string[];
    };
  }
}
