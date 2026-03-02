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

let prismaInstance: PrismaClient | undefined;

function getPrismaClient() {
  if (prismaInstance) {
    return prismaInstance;
  }

  if (globalForPrisma.prisma && hasCampaignDelegate(globalForPrisma.prisma)) {
    prismaInstance = globalForPrisma.prisma;
  } else {
    prismaInstance = createPrismaClient();

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaInstance;
    }
  }

  return prismaInstance;
}

function getCampaignDelegate() {
  const client = getPrismaClient() as PrismaClient & {
    campaign?: unknown;
  };

  return client.campaign;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as unknown as object, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { prisma };
export { getCampaignDelegate };
