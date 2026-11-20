---
name: feature-discount
title: feature-discount
description: "New behaviour, phrasing one: percentage discount on a cart total."
tags: [spec,feature]
plugins: ["../.."]
runs: 3
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Customers should be able to apply a percentage discount to their cart. Add that to the cart module in src/cart.ts and cover it with tests in src/cart.test.ts. The percent is a whole number from 0 to 100, and the discounted total stays in integer cents, rounded down.
