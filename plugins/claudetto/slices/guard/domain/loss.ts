// The database and infrastructure gates (X1): each rule reads the words of one command, so a quoted SQL text matches nothing.

import { baseName } from "../../../kernel/wrappers.ts";

const SQL_CLIENT =
  /^(?:psql|mysql|mariadb|sqlite3|sqlcmd|duckdb|clickhouse-client) /;
const DB_COMMANDS = [
  /^dropdb\b/,
  /^redis-cli\b.*\bflush(?:all|db)\b/i,
  /\bprisma migrate reset\b/,
  /\b(?:rails|rake) db:drop\b/,
];
const INFRA_COMMANDS = [
  /^(?:terraform|tofu) (?:.* )?(?:destroy\b|apply .*-destroy\b)/,
  /^pulumi (?:.* )?destroy\b/,
  /^kubectl (?:.* )?delete (?:namespace|namespaces|ns)\b/,
  /^aws (?:.* )?(?:s3 rb|s3api delete-bucket|ec2 delete-volume|rds delete-db-(?:instance|cluster))\b/,
  /^gcloud (?:.* )?(?:disks|buckets|instances) delete\b/,
  /^gsutil (?:.* )?rb\b/,
  /^az (?:.* )?(?:disk|storage account|storage container|sql db|sql server|cosmosdb) delete\b/,
];

/** True when the SQL text drops a database, a schema, or a table, truncates, or deletes with no `WHERE`. */
const sqlLoss = (sql: string): boolean =>
  sql
    .split(";")
    .some(
      (s) =>
        /\b(?:drop\s+(?:database|schema|table)|truncate)\b/i.test(s) ||
        (/\bdelete\s+from\b/i.test(s) && !/\bwhere\b/i.test(s)),
    );

/** `"db"` or `"infra"` when the command `rest` can lose a database or a cloud resource, else `null`. */
export const lossKind = (rest: string[]): "db" | "infra" | null => {
  const line = [baseName(rest[0] ?? ""), ...rest.slice(1)].join(" ");
  if (
    (SQL_CLIENT.test(line) && sqlLoss(line)) ||
    DB_COMMANDS.some((re) => re.test(line))
  )
    return "db";
  return INFRA_COMMANDS.some((re) => re.test(line)) ? "infra" : null;
};

/** True when `path` is a database file: `.sqlite`, `.sqlite3`, or `.db`. */
export const isDbFile = (path: string): boolean =>
  /\.(?:sqlite3?|db)$/.test(path);
