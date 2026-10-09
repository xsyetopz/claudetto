// The first loop, with a fixed delay. Nothing imports this file since 2.0.
import { sleep } from "./sleep.mjs";

export async function withBackoff(task, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await task();
    } catch (err) {
      if (i + 1 >= tries) throw err;
      await sleep(100);
    }
  }
}
