#!/usr/bin/env -S bun --no-env-file

import { main } from "./adapters/cli.ts";

process.exitCode = await main(process.argv.slice(2));
