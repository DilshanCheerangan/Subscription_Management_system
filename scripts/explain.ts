import { prisma } from "../lib/prisma";

async function main() {
  const res = (await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT
      s.id, s.number, s.status, s."startDate", s."createdAt",
      u.name as "customerName",
      p.name as "planName"
    FROM "Subscription" s
    JOIN "User" u ON s."customerId" = u.id
    JOIN "Plan" p ON s."planId" = p.id
    ORDER BY s."createdAt" DESC
    LIMIT 20;
  `)) as Array<{ "QUERY PLAN": string }>;

  console.log("Postgres Query Execution Plan:");
  for (const row of res) {
    console.log(row["QUERY PLAN"]);
  }
}

main().finally(() => prisma.$disconnect());
