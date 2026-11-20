---
name: trivial-typo
title: trivial-typo
description: "Negative twin: a typo fix adds no behaviour."
tags: [spec,trivial]
plugins: ["../.."]
runs: 3
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

There is a typo in README.md: "recieve" should be "receive". Please fix it.
