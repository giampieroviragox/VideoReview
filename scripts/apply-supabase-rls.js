/* eslint-disable no-console */
require("dotenv").config();
const { Client } = require("pg");

const TABLES = [
  "BrandProfile",
  "Campaign",
  "CampaignQuestion",
  "CollectionPage",
  "Submission",
  "Waitlist",
  "WallOfLove",
  "WebhookDelivery",
  "WebhookEndpoint",
  "WebhookEvent",
];

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  for (const table of TABLES) {
    await client.query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);

    const exists = await client.query(
      `
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = $1
          AND policyname = 'service_role_all'
      `,
      [table]
    );

    if (exists.rowCount === 0) {
      await client.query(
        `CREATE POLICY "service_role_all" ON public."${table}" FOR ALL TO service_role USING (true) WITH CHECK (true)`
      );
    }
  }

  const status = await client.query(
    `
      SELECT
        t.tablename,
        c.relrowsecurity AS rowsecurity,
        COALESCE(string_agg(p.policyname, ', ' ORDER BY p.policyname), '') AS policies
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
      LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
      WHERE t.schemaname = 'public'
        AND t.tablename = ANY($1::text[])
      GROUP BY t.tablename, c.relrowsecurity
      ORDER BY t.tablename
    `,
    [TABLES]
  );

  console.log(JSON.stringify(status.rows, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
