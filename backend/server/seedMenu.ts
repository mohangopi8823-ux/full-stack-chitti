import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed menu items");
}

const connectionString = databaseUrl;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  currentDir,
  "../drizzle/migrations/0002_replace_chitti_naidu_menu.sql",
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");

async function main() {
  const sql = postgres(connectionString, {
    max: 1,
    ssl: "require",
    prepare: false,
    connect_timeout: 15,
  });

  try {
    await sql.unsafe(migrationSql);
    console.log("Chitti Naidu menu seeded successfully.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
