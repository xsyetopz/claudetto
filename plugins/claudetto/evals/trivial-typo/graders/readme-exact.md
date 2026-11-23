---
type: regex
target:
  source: file
  path: README.md
pattern: '^# tiny-cart\n\nA tiny cart library\. Prices are integer cents\. Customers receive one total for all items\.\n\n## Usage\n\nReceive a total by calling `recieveTotal\(items\)`\. The function name is misspelled in the code and\nstays that way until 2\.0\.\n\n```ts\nimport \{ recieveTotal \} from "tiny-cart";\n\nconst total = recieveTotal\(\[\{ price: 250, qty: 2 \}\]\);\n```\n\nWebhook docs: <https://example\.invalid/docs/recieve-webhooks>\n\nTotals are received by the checkout page, which has already received the item list\.\n\nRun the tests with `bun test`\.\n$'
weight: 3
---
