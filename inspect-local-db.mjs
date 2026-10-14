import pg from "pg";

const connectionString = process.env.LOCAL_DATABASE_URL;

if (!connectionString) {
  throw new Error("LOCAL_DATABASE_URL is not set.");
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();

  const tables = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  console.log("\n=== PUBLIC TABLES ===");
  console.table(tables.rows);

  const migrations = await client.query(`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM public."_prisma_migrations"
    ORDER BY started_at
  `);

  console.log("\n=== MIGRATION HISTORY ===");
  console.table(migrations.rows);
} catch (error) {
  console.error("Database inspection failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
