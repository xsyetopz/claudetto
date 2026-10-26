// The public surface of the module `gate`: the permission gate and its tool hooks.

export * from "./adapters/mod.ts";
export {
  HOME_SECRETS,
  SYSTEM_DIRS,
  SYSTEM_OPEN,
} from "./domain/paths.ts";
export { onResult as onSecrets } from "./secrets/index.ts";
