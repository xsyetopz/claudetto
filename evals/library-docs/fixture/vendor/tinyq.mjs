export function createQueue() {
  const items = [];
  return {
    add(item, rank) {
      items.push({ item, rank });
      items.sort((a, b) => a.rank - b.rank);
    },
    take() {
      return items.shift()?.item;
    },
    get size() {
      return items.length;
    },
  };
}
