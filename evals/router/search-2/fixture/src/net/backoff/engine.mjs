import { sleep } from "./sleep.mjs";

export default async function runWithBackoff(task, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      return await task();
    } catch (err) {
      if (i + 1 >= tries) throw err;
      await sleep(2 ** i * 100);
    }
  }
}
