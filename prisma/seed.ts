import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@brightloop.test").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  console.log(`[Seed] Seeding System Admin with email: ${adminEmail}...`);

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Administrator",
      role: "ADMIN",
      passwordHash,
    },
    create: {
      email: adminEmail,
      name: "System Administrator",
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(`[Seed] System Admin ready: ${admin.email} (Role: ${admin.role})`);

  // Initialize number sequences for SUB-00001 and INV-00001
  await prisma.numberSequence.upsert({
    where: { type: "SUBSCRIPTION" },
    update: {},
    create: { type: "SUBSCRIPTION", nextValue: 1 },
  });

  await prisma.numberSequence.upsert({
    where: { type: "INVOICE" },
    update: {},
    create: { type: "INVOICE", nextValue: 1 },
  });

  // Seed default standard Payment Terms
  const defaultTerms = [
    { name: "Immediate", days: 0 },
    { name: "15 Days", days: 15 },
    { name: "30 Days", days: 30 },
  ];

  for (const term of defaultTerms) {
    const existing = await prisma.paymentTerm.findFirst({
      where: { name: term.name },
    });
    if (!existing) {
      await prisma.paymentTerm.create({
        data: { name: term.name, days: term.days, active: true },
      });
    }
  }

  console.log("[Seed] Base sequences and standard payment terms initialized.");
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
