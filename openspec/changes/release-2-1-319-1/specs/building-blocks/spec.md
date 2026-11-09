## REMOVED Requirements

### Requirement: Each Surface Change Is a Block

**Reason**: No `attachBlocks` exists in `plugins/`. Each plugin's `register.ts` attaches its own hooks, and the person chose to remove the capability.
**Migration**: None. Add a surface change as a hook module and call it from the plugin's `register.ts`.

### Requirement: A Route Change Fails One Block

**Reason**: No block catalog exists, so no lab file holds a case per block route. The hook lab files stay, one per hook module.
**Migration**: None. Each hook module keeps its own lab file.
