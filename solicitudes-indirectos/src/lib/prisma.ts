import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
