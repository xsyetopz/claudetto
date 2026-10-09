# tinyq

`createQueue()` makes a queue.
`q.add(item, rank)` adds an item.
A lower `rank` is taken first.
`q.take()` removes and returns the next item, or `undefined` when the queue is empty.
