---
type: regex
target:
  source: file
  path: README.md
pattern: '^(?=[\s\S]*calling `recieveTotal\(items\)`)(?=[\s\S]*import \{ recieveTotal \} from "tiny-cart";)(?=[\s\S]*const total = recieveTotal\()(?=[\s\S]*docs/recieve-webhooks)(?![\s\S]*receiveTotal)(?![\s\S]*receive-webhooks)'
weight: 3
---
