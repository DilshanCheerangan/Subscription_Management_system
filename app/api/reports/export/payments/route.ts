import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { resolveDateRange, ReportFilterParams } from "@/lib/reporting";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const searchParams = request.nextUrl.searchParams;
    const filterParams: ReportFilterParams = {
      preset: (searchParams.get("preset") as ReportFilterParams["preset"]) || "this_month",
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      customerId: searchParams.get("customerId") || undefined,
      planId: searchParams.get("planId") || undefined,
    };

    const { from: dateFrom, to: dateTo } = resolveDateRange(filterParams);
    const customerId = filterParams.customerId && filterParams.customerId !== "ALL" ? filterParams.customerId : null;
    const planId = filterParams.planId && filterParams.planId !== "ALL" ? filterParams.planId : null;

    const payments = await prisma.$queryRaw<
      Array<{
        paymentDate: Date;
        invoiceNumber: string;
        customerName: string;
        method: string;
        amount: Prisma.Decimal | number;
        note: string | null;
      }>
    >`
      SELECT
        pm."paymentDate",
        inv."number" as "invoiceNumber",
        u."name" as "customerName",
        pm."method"::text as method,
        pm."amount",
        pm."note"
      FROM "Payment" pm
      JOIN "Invoice" inv ON pm."invoiceId" = inv."id"
      JOIN "User" u ON inv."customerId" = u."id"
      JOIN "Subscription" s ON inv."subscriptionId" = s."id"
      WHERE pm."paymentDate" >= ${dateFrom}
        AND pm."paymentDate" <= ${dateTo}
        ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
        ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      ORDER BY pm."paymentDate" DESC;
    `;

    // Stream CSV response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // CSV Header
        const header = "Payment Date,Invoice Number,Customer Name,Payment Method,Amount (INR),Note\n";
        controller.enqueue(encoder.encode(header));

        for (const row of payments) {
          const line = [
            `"${format(row.paymentDate, "yyyy-MM-dd HH:mm")}"`,
            `"${row.invoiceNumber}"`,
            `"${(row.customerName || "").replace(/"/g, '""')}"`,
            `"${row.method}"`,
            Number(row.amount).toFixed(2),
            `"${(row.note || "").replace(/"/g, '""')}"`,
          ].join(",") + "\n";

          controller.enqueue(encoder.encode(line));
        }

        controller.close();
      },
    });

    const filename = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to export payments";
    return new NextResponse(message, { status: 403 });
  }
}
