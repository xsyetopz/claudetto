// A test double with its own `retryWithBackoff`. It runs the task one time.
const retryWithBackoff = (task) => task();
export const mocked = (task) => retryWithBackoff(task);
