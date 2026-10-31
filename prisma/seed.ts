import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient, ProductType, BillingPeriod, DiscountType, DiscountScope } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Brightloop SMS: Seeding Demo & Configuration Data ===");

  // 1. Seed System Admin
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@brightloop.test").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  console.log(`[Seed] Seeding System Admin: ${adminEmail}...`);
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
  console.log(`[Seed] System Admin ready: ${admin.email}`);

  // 2. Initialize number sequences for SUB-00001 and INV-00001
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

  // 3. Seed Payment Terms (Immediate=0, 15 Days, 30 Days)
  console.log("[Seed] Seeding standard Payment Terms...");
  const paymentTermsData = [
    { name: "Immediate", days: 0 },
    { name: "15 Days", days: 15 },
    { name: "30 Days", days: 30 },
  ];

  const paymentTermsMap: Record<string, string> = {};
  for (const term of paymentTermsData) {
    let pt = await prisma.paymentTerm.findFirst({ where: { name: term.name } });
    if (!pt) {
      pt = await prisma.paymentTerm.create({
        data: { name: term.name, days: term.days, active: true },
      });
    }
    paymentTermsMap[term.name] = pt.id;
  }
  console.log("[Seed] Payment Terms ready: Immediate, 15 Days, 30 Days");

  // 4. Seed Taxes (GST 18% and GST 5%)
  console.log("[Seed] Seeding standard Taxes (GST 18%, GST 5%)...");
  const taxesData = [
    { name: "GST 18%", percentage: 18.0, fixedAmount: 0.0 },
    { name: "GST 5%", percentage: 5.0, fixedAmount: 0.0 },
  ];

  const taxesMap: Record<string, string> = {};
  for (const tax of taxesData) {
    let t = await prisma.tax.findFirst({ where: { name: tax.name } });
    if (!t) {
      t = await prisma.tax.create({
        data: {
          name: tax.name,
          percentage: tax.percentage,
          fixedAmount: tax.fixedAmount,
          active: true,
        },
      });
    }
    taxesMap[tax.name] = t.id;
  }
  console.log("[Seed] Taxes ready: GST 18%, GST 5%");

  // 5. Seed 3 Products with Odoo Brand Variant (+560)
  console.log("[Seed] Seeding Products & Variants with Odoo brand variant (+560)...");
  const productsData = [
    {
      name: "BrightERP Cloud Core",
      type: ProductType.SOFTWARE,
      salesPrice: 2499.0,
      costPrice: 800.0,
      notes: "Flagship multi-tenant ERP software license",
      variants: [
        { attributeName: "Brand", attributeValue: "Standard", extraPrice: 0.0 },
        { attributeName: "Brand", attributeValue: "Odoo", extraPrice: 560.0 },
      ],
    },
    {
      name: "Dedicated Cloud Server Node",
      type: ProductType.GOODS,
      salesPrice: 4999.0,
      costPrice: 2500.0,
      notes: "High performance cloud instance with SSD RAID",
      variants: [
        { attributeName: "Brand", attributeValue: "Standard", extraPrice: 0.0 },
        { attributeName: "Brand", attributeValue: "Odoo Edition", extraPrice: 560.0 },
      ],
    },
    {
      name: "Priority Implementation & Consulting",
      type: ProductType.SERVICE,
      salesPrice: 7500.0,
      costPrice: 3000.0,
      notes: "20 hours onboarding and workflow customization",
      variants: [
        { attributeName: "Brand", attributeValue: "Standard Partner", extraPrice: 0.0 },
        { attributeName: "Brand", attributeValue: "Odoo Specialist", extraPrice: 560.0 },
      ],
    },
  ];

  const productsMap: Record<string, { id: string; variants: Record<string, string> }> = {};

  for (const prod of productsData) {
    let p = await prisma.product.findFirst({
      where: { name: prod.name },
      include: { variants: true },
    });

    if (!p) {
      p = await prisma.product.create({
        data: {
          name: prod.name,
          type: prod.type,
          salesPrice: prod.salesPrice,
          costPrice: prod.costPrice,
          notes: prod.notes,
          active: true,
          variants: {
            create: prod.variants.map((v) => ({
              attributeName: v.attributeName,
              attributeValue: v.attributeValue,
              extraPrice: v.extraPrice,
            })),
          },
        },
        include: { variants: true },
      });
    }

    const varMap: Record<string, string> = {};
    p.variants.forEach((v) => {
      varMap[v.attributeValue] = v.id;
    });

    productsMap[prod.name] = { id: p.id, variants: varMap };
  }
  console.log("[Seed] 3 Products with Odoo brand variant (+560) ready.");

  // 6. Seed 4 Plans across all Billing Periods (DAILY, WEEKLY, MONTHLY, YEARLY)
  console.log("[Seed] Seeding 4 Plans across all billing periods...");
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const coreProduct = productsMap["BrightERP Cloud Core"];

  const plansData = [
    {
      name: "Daily Sandbox Testing",
      billingPeriod: BillingPeriod.DAILY,
      price: 199.0,
      minQuantity: 1,
      linkedProductId: coreProduct?.id,
      autoClose: false,
      closable: true,
      pausable: false,
      renewable: true,
    },
    {
      name: "Weekly Starter Sprint",
      billingPeriod: BillingPeriod.WEEKLY,
      price: 999.0,
      minQuantity: 1,
      linkedProductId: coreProduct?.id,
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
    },
    {
      name: "Professional Business Monthly",
      billingPeriod: BillingPeriod.MONTHLY,
      price: 2999.0,
      minQuantity: 1,
      linkedProductId: coreProduct?.id,
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
    },
    {
      name: "Enterprise Growth Annual",
      billingPeriod: BillingPeriod.YEARLY,
      price: 29999.0,
      minQuantity: 1,
      linkedProductId: coreProduct?.id,
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
    },
  ];

  const plansMap: Record<string, string> = {};
  for (const pl of plansData) {
    let plan = await prisma.plan.findFirst({ where: { name: pl.name } });
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: pl.name,
          billingPeriod: pl.billingPeriod,
          price: pl.price,
          minQuantity: pl.minQuantity,
          availableFrom: pastDate,
          availableTo: futureDate,
          linkedProductId: pl.linkedProductId,
          autoClose: pl.autoClose,
          closable: pl.closable,
          pausable: pl.pausable,
          renewable: pl.renewable,
          active: true,
        },
      });
    }
    plansMap[pl.name] = plan.id;
  }
  console.log("[Seed] 4 Plans ready (DAILY, WEEKLY, MONTHLY, YEARLY)");

  // 7. Seed 2 Discounts (1 SUBSCRIPTION percentage, 1 PRODUCT fixed)
  console.log("[Seed] Seeding 2 Discounts...");
  const discountsData = [
    {
      name: "WELCOME15",
      type: DiscountType.PERCENTAGE,
      value: 15.0,
      minPurchase: 1000.0,
      minQuantity: 1,
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      usedCount: 3,
      scope: DiscountScope.SUBSCRIPTION,
      productIds: [] as string[],
    },
    {
      name: "ODOOPROMO500",
      type: DiscountType.FIXED,
      value: 500.0,
      minPurchase: 2000.0,
      minQuantity: 1,
      startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      usageLimit: 50,
      usedCount: 1,
      scope: DiscountScope.PRODUCT,
      productIds: [
        productsMap["BrightERP Cloud Core"]?.id,
        productsMap["Dedicated Cloud Server Node"]?.id,
      ].filter(Boolean) as string[],
    },
  ];

  for (const d of discountsData) {
    const disc = await prisma.discount.findFirst({ where: { name: d.name } });
    if (!disc) {
      await prisma.discount.create({
        data: {
          name: d.name,
          type: d.type,
          value: d.value,
          minPurchase: d.minPurchase,
          minQuantity: d.minQuantity,
          startDate: d.startDate,
          endDate: d.endDate,
          usageLimit: d.usageLimit,
          usedCount: d.usedCount,
          scope: d.scope,
          active: true,
          products:
            d.scope === DiscountScope.PRODUCT && d.productIds.length > 0
              ? { connect: d.productIds.map((id) => ({ id })) }
              : undefined,
        },
      });
    }
  }
  console.log("[Seed] 2 Discounts ready: WELCOME15 (15% Subscription), ODOOPROMO500 (₹500 Product)");

  // 8. Seed 2 Quotation Templates
  console.log("[Seed] Seeding 2 Quotation Templates...");
  const templatesData = [
    {
      name: "SaaS Professional Onboarding Package",
      validityDays: 30,
      planId: plansMap["Professional Business Monthly"],
      lines: [
        {
          productId: productsMap["BrightERP Cloud Core"]?.id,
          variantId: productsMap["BrightERP Cloud Core"]?.variants["Odoo"],
          quantity: 1,
          unitPrice: 3059.0, // 2499 + 560
          taxId: taxesMap["GST 18%"],
        },
        {
          productId: productsMap["Priority Implementation & Consulting"]?.id,
          variantId: null,
          quantity: 1,
          unitPrice: 7500.0,
          taxId: taxesMap["GST 18%"],
        },
      ],
    },
    {
      name: "Enterprise Cloud Infrastructure Bundle",
      validityDays: 45,
      planId: plansMap["Enterprise Growth Annual"],
      lines: [
        {
          productId: productsMap["BrightERP Cloud Core"]?.id,
          variantId: productsMap["BrightERP Cloud Core"]?.variants["Odoo"],
          quantity: 2,
          unitPrice: 3059.0,
          taxId: taxesMap["GST 18%"],
        },
        {
          productId: productsMap["Dedicated Cloud Server Node"]?.id,
          variantId: productsMap["Dedicated Cloud Server Node"]?.variants["Odoo Edition"],
          quantity: 1,
          unitPrice: 5559.0, // 4999 + 560
          taxId: taxesMap["GST 18%"],
        },
        {
          productId: productsMap["Priority Implementation & Consulting"]?.id,
          variantId: null,
          quantity: 2,
          unitPrice: 7500.0,
          taxId: taxesMap["GST 5%"],
        },
      ],
    },
  ];

  for (const tmpl of templatesData) {
    const t = await prisma.quotationTemplate.findFirst({ where: { name: tmpl.name } });
    if (!t) {
      await prisma.quotationTemplate.create({
        data: {
          name: tmpl.name,
          validityDays: tmpl.validityDays,
          planId: tmpl.planId,
          lines: {
            create: tmpl.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxId: l.taxId,
            })),
          },
        },
      });
    }
  }
  console.log("[Seed] 2 Quotation Templates ready with line items, Odoo variants, and taxes.");
  console.log("=== Seed Completed Successfully ===");
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
