import pg from "pg";

const connectionString = process.env.LOCAL_DATABASE_URL;

if (!connectionString) {
  throw new Error("LOCAL_DATABASE_URL is not set.");
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();

  const result = await client.query(`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      inet_server_addr() AS server
  `);

  console.table(result.rows);
} finally {
  await client.end();
}
