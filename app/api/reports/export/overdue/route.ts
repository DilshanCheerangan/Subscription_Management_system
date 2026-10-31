import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const planId = searchParams.get("planId");

    const overdueInvoices = await prisma.$queryRaw<
      Array<{
        number: string;
        dueDate: Date;
        daysOverdue: number;
        customerName: string;
        customerEmail: string;
        subscriptionNumber: string;
        total: Prisma.Decimal | number;
        amountPaid: Prisma.Decimal | number;
        amountDue: Prisma.Decimal | number;
      }>
    >`
      SELECT
        inv."number",
        inv."dueDate",
        (CURRENT_DATE - inv."dueDate"::date)::int as "daysOverdue",
        u."name" as "customerName",
        u."email" as "customerEmail",
        s."number" as "subscriptionNumber",
        inv."total",
        inv."amountPaid",
        (inv."total" - inv."amountPaid") as "amountDue"
      FROM "Invoice" inv
      JOIN "User" u ON inv."customerId" = u."id"
      JOIN "Subscription" s ON inv."subscriptionId" = s."id"
      WHERE inv."status" = 'CONFIRMED'
        AND inv."total" > inv."amountPaid"
        AND inv."dueDate" < CURRENT_DATE
        ${customerId && customerId !== "ALL" ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
        ${planId && planId !== "ALL" ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      ORDER BY (CURRENT_DATE - inv."dueDate"::date) DESC;
    `;

    // Stream CSV response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // CSV Header
        const header = "Invoice Number,Customer Name,Customer Email,Subscription Number,Due Date,Days Overdue,Total (INR),Amount Paid (INR),Amount Due (INR)\n";
        controller.enqueue(encoder.encode(header));

        for (const row of overdueInvoices) {
          const line = [
            `"${row.number}"`,
            `"${(row.customerName || "").replace(/"/g, '""')}"`,
            `"${(row.customerEmail || "").replace(/"/g, '""')}"`,
            `"${row.subscriptionNumber}"`,
            `"${format(row.dueDate, "yyyy-MM-dd")}"`,
            row.daysOverdue,
            Number(row.total).toFixed(2),
            Number(row.amountPaid).toFixed(2),
            Number(row.amountDue).toFixed(2),
          ].join(",") + "\n";

          controller.enqueue(encoder.encode(line));
        }

        controller.close();
      },
    });

    const filename = `overdue-invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to export overdue invoices";
    return new NextResponse(message, { status: 403 });
  }
}
