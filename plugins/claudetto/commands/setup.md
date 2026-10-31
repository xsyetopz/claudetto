---
description: Write claudetto's settings.
---

The `command.run` hook of `src/blocks/settings-commands.ts` answers this command in code, so this body is read
only when the hooks module did not load. Tell the user that, and that `just setup` does the same work
from a checkout of the repository.
