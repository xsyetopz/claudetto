// The output port and the clock of the commands of `dotclaude-spec`.

/** Where a command writes its lines. */
export interface Io {
  log(line: string): void;
  error(line: string): void;
}

/** The `Io` of a terminal. */
export const consoleIo: Io = {
  log: (line) => console.log(line),
  error: (line) => console.error(line),
};

/** The current time. A test gives a fixed one. */
export interface Clock {
  now(): Date;
}

/** The `Clock` of the system. */
export const systemClock: Clock = { now: () => new Date() };
