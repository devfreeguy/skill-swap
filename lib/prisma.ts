import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ActiveNetwork } from "@/lib/network";

function createClient(url: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const g = globalThis as unknown as {
  prismaMainnet: PrismaClient | undefined;
  prismaPreprod: PrismaClient | undefined;
};

export function getPrisma(network: ActiveNetwork): PrismaClient {
  if (network === "mainnet") {
    const url = process.env.DATABASE_URL_MAINNET ?? process.env.DATABASE_URL!;
    g.prismaMainnet ??= createClient(url);
    return g.prismaMainnet;
  }
  const url = process.env.DATABASE_URL_PREPROD ?? process.env.DATABASE_URL!;
  g.prismaPreprod ??= createClient(url);
  return g.prismaPreprod;
}

// Default export (preprod) kept for public/unauthenticated routes.
const prisma = getPrisma("preprod");
export default prisma;
