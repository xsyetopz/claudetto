// arm-c2 plus one task example: a report that work the user asked for is still broken.
import { PIN_EXTRACT as c2 } from "./arm-c2.ts";
export const PIN_EXTRACT = (...a: Parameters<typeof c2>) =>
	c2(...a).replace(`("that's wrong, fix it");`, `("that's wrong, fix it"), or a report that work the user asked for earlier still fails ("I still get the error");`);
