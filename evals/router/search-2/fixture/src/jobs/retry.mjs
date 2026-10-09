// The job queue has its own `retryWithBackoff`. It is not the function of `src/net`.
export function retryWithBackoff(job, delay = 1000) {
  return setTimeout(job, delay);
}
