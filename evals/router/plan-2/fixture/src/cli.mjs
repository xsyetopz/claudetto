import { get } from "./http.mjs";

export const run = (url) => get(url, "app.json");
