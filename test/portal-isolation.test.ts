import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPortalSubscriptionDetailAction,
  getPortalInvoiceDetailAction,
  portalCustomerSubscriptionAction,
} from "@/app/actions/portal";

describe("Customer Portal Multi-Tenant Isolation & 404 Guard", () => {
  const customerA = {
    userId: "cust_a_id",
    name: "Customer Alice",
    email: "alice@company-a.test",
    role: "CUSTOMER",
  };

  const customerB = {
    userId: "cust_b_id",
    name: "Customer Bob",
    email: "bob@company-b.test",
    role: "CUSTOMER",
  };

  const subscriptionOfCustomerB = {
    id: "sub_b_999",
    number: "SUB-00099",
    customerId: "cust_b_id",
    status: "ACTIVE",
    startDate: new Date("2026-01-01"),
    expiryDate: new Date("2026-12-31"),
    nextInvoiceDate: new Date("2026-02-01"),
    plan: {
      id: "plan_1",
      name: "Pro Plan",
      billingPeriod: "MONTHLY",
      price: 2999,
      pausable: true,
      closable: true,
      autoClose: false,
      renewable: true,
    },
    paymentTerm: { name: "Immediate" },
    lines: [],
    history: [],
    invoices: [],
  };

  const invoiceOfCustomerB = {
    id: "inv_b_888",
    number: "INV-00088",
    customerId: "cust_b_id",
    status: "CONFIRMED",
    total: 2999,
    amountPaid: 0,
    dueDate: new Date("2026-02-15"),
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-01-31"),
    customer: { id: "cust_b_id", name: "Customer Bob", email: "bob@company-b.test" },
    subscription: {
      id: "sub_b_999",
      number: "SUB-00099",
      plan: { name: "Pro Plan", billingPeriod: "MONTHLY" },
      paymentTerm: { name: "Immediate" },
    },
    lines: [],
    discounts: [],
    payments: [],
    createdAt: new Date("2026-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks Customer A from opening Customer B's subscription by URL and returns notFound (404)", async () => {
    // Authenticated as Customer A
    vi.mocked(getSessionUser).mockResolvedValue(customerA as unknown as never);
    // Database returns Customer B's subscription
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscriptionOfCustomerB as unknown as never);

    const result = await getPortalSubscriptionDetailAction("sub_b_999");

    // Must return success: false and notFound: true so the route handler triggers notFound()
    expect(result.success).toBe(false);
    expect(result.notFound).toBe(true);
    expect(result.error).toMatch(/not found/i);
  });

  it("allows Customer B to open their own subscription", async () => {
    // Authenticated as Customer B
    vi.mocked(getSessionUser).mockResolvedValue(customerB as unknown as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscriptionOfCustomerB as unknown as never);

    const result = await getPortalSubscriptionDetailAction("sub_b_999");

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("sub_b_999");
    expect(result.data?.number).toBe("SUB-00099");
  });

  it("blocks Customer A from opening Customer B's invoice by URL and returns notFound (404)", async () => {
    // Authenticated as Customer A
    vi.mocked(getSessionUser).mockResolvedValue(customerA as unknown as never);
    // Database returns Customer B's invoice
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceOfCustomerB as unknown as never);

    const result = await getPortalInvoiceDetailAction("inv_b_888");

    // Must return success: false and notFound: true so the route handler triggers notFound()
    expect(result.success).toBe(false);
    expect(result.notFound).toBe(true);
    expect(result.error).toMatch(/not found/i);
  });

  it("allows Customer B to open their own invoice", async () => {
    // Authenticated as Customer B
    vi.mocked(getSessionUser).mockResolvedValue(customerB as unknown as never);
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceOfCustomerB as unknown as never);

    const result = await getPortalInvoiceDetailAction("inv_b_888");

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("inv_b_888");
    expect(result.data?.number).toBe("INV-00088");
  });

  it("prevents Customer A from pausing, resuming, or closing Customer B's subscription", async () => {
    // Authenticated as Customer A
    vi.mocked(getSessionUser).mockResolvedValue(customerA as unknown as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscriptionOfCustomerB as unknown as never);

    const pauseResult = await portalCustomerSubscriptionAction({
      subscriptionId: "sub_b_999",
      action: "PAUSE",
    });

    expect(pauseResult.success).toBe(false);
    expect(pauseResult.error).toMatch(/access denied|not found/i);

    const closeResult = await portalCustomerSubscriptionAction({
      subscriptionId: "sub_b_999",
      action: "CLOSE",
    });

    expect(closeResult.success).toBe(false);
    expect(closeResult.error).toMatch(/access denied|not found/i);
  });
});
