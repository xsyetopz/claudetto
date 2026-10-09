// A bounded queue: `push` drops the oldest item when `limit` is reached.
export function createQueue(limit = 10) {
  const items = [];
  return {
    push(item) {
      items.push(item);
      if (items.length > limit) items.shift();
    },
    shift: () => items.shift(),
  };
}
