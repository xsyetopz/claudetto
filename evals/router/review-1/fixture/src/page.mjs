export function clampPage(page, count) {
  return Math.max(0, Math.min(page, count - 1));
}

export function pageCount(total, size) {
  return Math.floor(total / size);
}

export function paginate(items, page, size) {
  const start = clampPage(page, pageCount(items.length, size)) * size;
  return items.slice(start, start + size);
}

export function hasNext(page, size, total) {
  return (page + 1) * size <= total;
}
