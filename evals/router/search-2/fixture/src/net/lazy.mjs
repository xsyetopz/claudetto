export async function lazy(task) {
  const { retryWithBackoff: again } = await import("./retry.mjs");
  return again(task);
}
