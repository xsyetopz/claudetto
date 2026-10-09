import { scan } from "../time/impl/scan.mjs";

export const batch = (list) => list.map((text) => scan(text));
