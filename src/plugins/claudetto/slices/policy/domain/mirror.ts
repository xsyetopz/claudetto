// The files that the `pre-push` hook of git reads: the login, the organizations that the user owns, and one file for each verdict.
// The hook is a shell script, so it reads plain files and not the JSON records of the store.
// The paths come from the kernel module `push-hook`, so that the script and this slice agree.

import {
  CONSENT_DIR,
  FLAT_DIR,
  LOGIN_FILE,
  ORGS_FILE,
  safeOf,
  sessionDirOf,
} from "../../../../../kernel/push-hook/index.ts";
import { storeDirOf } from "./verdict.ts";

/** The file with the login of the user. */
export const loginFileOf = (home: string): string =>
  `${storeDirOf(home)}/${LOGIN_FILE}`;

/** The file with the organizations that the user owns, one login on each line. */
export const orgsFileOf = (home: string): string =>
  `${storeDirOf(home)}/${ORGS_FILE}`;

/** The file with the verdict word of a repository key. */
export const flatFileOf = (home: string, key: string): string =>
  `${storeDirOf(home)}/${FLAT_DIR}/${safeOf(key)}`;

/** The file with the one-time consent of a session for a repository key. */
export const tokenFileOf = (
  home: string,
  session: string,
  key: string,
): string =>
  `${storeDirOf(home)}/${CONSENT_DIR}/${sessionDirOf(session)}/${safeOf(key)}`;
