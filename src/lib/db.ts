import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Fallback for build time if DATABASE_URL is missing
  // or if we want to handle missing env var gracefully
  return new PrismaClient();
}

function hasCampaignDelegate(client: PrismaClient) {
  return "campaign" in (client as PrismaClient & Record<string, unknown>);
}

function getCampaignDelegate() {
  const client = prisma as PrismaClient & {
    campaign?: unknown;
  };

  return client.campaign;
}

let prisma: PrismaClient;

if (globalForPrisma.prisma && hasCampaignDelegate(globalForPrisma.prisma)) {
  prisma = globalForPrisma.prisma;
} else {
  prisma = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
export { getCampaignDelegate };
