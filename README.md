# Brightloop SMS — Unified Subscription & Billing Platform

A modern, high-performance, full-lifecycle subscription management and automatic billing platform engineered for SaaS and enterprise software companies (Brightloop Software). Built for speed, mathematical correctness, strict idempotency, and professional user experience.

---

## 1. Overview & Core Features

Brightloop SMS manages the complete commercial lifecycle of recurring revenue contracts:
- **Product & Variant Catalog**: Multi-currency-ready catalog supporting goods, services, and software licenses, complete with attribute variants (e.g., Odoo Brand `+₹560`) and margin tracking.
- **Configurable Plans**: Daily, Weekly, Monthly, and Yearly billing periods with lifecycle governance flags (`autoClose`, `closable`, `pausable`, `renewable`).
- **Quotation Templates & Fast Quoting**: Reusable pricing templates with line-level discounts and automatic validity scheduling (`validUntil = today + validityDays`).
- **Lifecycle State Machine**: Strict sequential transitions (`DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED`), reversible pausing (`ACTIVE` ↔ `PAUSED`), and immutable transition audit logging (`SubscriptionStatusHistory`).
- **Automated Idempotent Billing Engine**: Batched catch-up invoicing with composite uniqueness on `(subscriptionId, periodStart)`, ensuring zero double-billing and atomic advancement of invoice dates.
- **Rule-Based Discount & Tax Engine**: Product- and subscription-level percentage/fixed discounts with threshold checks, half-up rounding, and line-level tax computation.
- **Payments & Auto-Settlement**: Partial and full payments with chronological balance tracking and automatic transition to `PAID` once settled.
- **Customer Portal**: Isolated multi-tenant portal where subscribers manage active plans, review invoices, make payments, and download print-ready tax receipts.
- **Finance Analytics Dashboard**: Real-time SQL aggregations for MRR, active subscribers, revenue collected, overdue balances, and interactive trend charts with streaming CSV export.

---

## 2. Architecture & Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack, Partial Prerendering, Server Actions)
- **Language**: TypeScript Strict (`noEmit: true`, zero `any`)
- **Styling**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) design system (Inter typography, slate palette, indigo-600 primary)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io) and PgBouncer connection pooling
- **Authentication**: JWT signed via [`jose`](https://github.com/panva/jose) stored in `httpOnly` secure cookies with `bcryptjs` password hashing
- **Role-Based Access Control (RBAC)**: Triple-layer enforcement across Middleware, Server Actions, and UI components (`ADMIN`, `STAFF`, `CUSTOMER`)
- **Calculations & Math**: High-precision arithmetic via `Decimal(12,2)` with line-level half-up rounding (`lib/money.ts`)
- **Data Export**: RFC 4180-compliant streaming CSV route handlers

---

## 3. Environment Variables Setup

Create a `.env` or `.env.local` file in the project root based on [.env.example](file:///.env.example):

```env
# Database Connections (PgBouncer Pooled + Direct for Migrations)
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT Authentication Secret
JWT_SECRET="brightloop-super-secure-jwt-secret-min-32-chars-key-2026"

# Default System Admin
ADMIN_EMAIL="admin@brightloop.test"
ADMIN_PASSWORD="Admin@12345"

# Automated Billing Cron Authentication
CRON_SECRET="cron-super-secret-token-brightloop-2026"

# Email / SMTP Settings (Mailtrap or standard SMTP)
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-user"
SMTP_PASS="your-mailtrap-password"
SMTP_FROM="Brightloop Billing <billing@brightloop.test>"
```

---

## 4. Quick Start & Installation

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Apply Database Schema & Migrations
```bash
npm run db:migrate
```

### Step 3: Seed Base Demo Catalog
Seeds System Admin, GST tax rules (18% & 5%), Payment terms (Immediate, 15 Days, 30 Days), 3 Products with Odoo brand variants (+₹560), 4 Plans across all frequencies, 2 Discounts, and 2 Quotation templates:
```bash
npm run db:seed
```

### Step 4: High-Performance Benchmark Seed (Phase 8)
Populates 50 customers, 2,000 subscriptions, and 5,000 invoices with realistic payments using bulk `createMany` in under 1 minute:
```bash
npm run db:seed:perf
```

### Step 5: Start Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

---

## 5. Seed Accounts & Credentials

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@brightloop.test` | `Admin@12345` | Full administrative control: staff creation, catalog, billing runs, finance reports, discounts, and tax settings |
| **STAFF** | `staff@brightloop.test` | `Staff@12345` | Day-to-day operations: subscriptions, quotations, invoices, payments, finance reports (Read-only on config) |
| **CUSTOMER** | `customer1@brightloop.test` (through `customer50@brightloop.test`) | `Customer@12345` | Customer Portal only: personal subscriptions (pause/renew/close where allowed), invoices, and payment receipts |

---

## 6. Automated Billing Run Execution

The billing engine scans all active subscriptions where `nextInvoiceDate <= today`, detects missed billing cycles, applies eligible discounts, creates invoices atomically, and advances contract dates:

### Option A: From Admin UI
1. Navigate to `/admin/billing-run` as Admin or Staff.
2. Click **"Run Automated Invoicing Now"**.
3. View the live execution dialog showing `Created`, `Skipped`, `Closed`, and `Failed` contracts.

### Option B: Via Secured Cron API
Send an authenticated `GET` or `POST` request with the Bearer token:
```bash
curl -X POST http://localhost:3000/api/cron/billing \
  -H "Authorization: Bearer cron-super-secret-token-brightloop-2026"
```

**Idempotency Guarantee**: Subscriptions feature a composite database constraint on `@@unique([subscriptionId, periodStart])`. Running billing multiple times for the same period safely returns `0 new invoices` without duplicate charges or corrupted balances.

---

## 7. Business Decisions & Assumptions

1. **State Machine Strictness**: Subscriptions cannot bypass states. Transitions follow `DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED`. Reversible pausing is restricted by the plan's `pausable` flag; early closures prior to expiry respect the `closable` flag.
2. **Advance Billing**: Invoices are generated at the start of each service period (`periodStart`) for upcoming usage.
3. **Discount Precedence**: Product-level discounts reduce eligible line subtotals first; subscription-wide discounts apply to the resulting contract subtotal. Subtotals never fall below zero.
4. **Tenant Isolation**: Customers accessing `/portal/*` are strictly scoped by `session.userId`. Attempting to access another tenant's subscription or invoice ID returns HTTP 404 (`notFound()`).

---

## 8. Verification & Test Commands

Run the test suite and validation scripts:

```bash
# 1. Vitest Unit Tests (Tax engine, discount rules, tenant isolation, reporting math)
npm test

# 2. Performance Latency Benchmark (Measures all 12 list pages against 5,000+ invoices)
npx tsx scripts/measure-pages-perf.ts

# 3. Billing Engine Idempotency & Catch-Up Verification
npx tsx scripts/test-billing-engine.ts

# 4. Subscription State Machine & Auto-Close Lifecycle Verification
npx tsx scripts/test-subscription-lifecycle.ts

# 5. Customer Portal Multi-Tenant Isolation Verification
npx tsx scripts/test-portal-isolation.ts

# 6. SMTP Mailtrap Verification
npm run test:mail

# 7. Code Quality & Build Checks
npm run lint
npm run typecheck
npm run build
```

---

## 9. Performance Benchmark Results

Benchmarked with **50 customers**, **2,008 subscriptions**, **5,012 invoices**, and **3,535 payments** on PostgreSQL:

| Page / Route | Query Type | Postgres Engine Time | End-to-End Latency | SLA Status |
| :--- | :--- | :--- | :--- | :--- |
| `/admin/reports` | Composite SQL Aggregates | `8.42ms` | `930.8ms` | **PASS (<1.5s)** |
| `/admin/subscriptions` | Paginated List (20 rows) | `0.36ms` | `1,189.7ms` | **PASS (<1.5s)** |
| `/admin/invoices` | Paginated List (20 rows) | `0.41ms` | `1,250.6ms` | **PASS (<1.5s)** |
| `/admin/payments` | Paginated List (20 rows) | `0.29ms` | `1,246.4ms` | **PASS (<1.5s)** |
| `/admin/products` | Catalog List | `0.22ms` | `1,039.8ms` | **PASS (<1.5s)** |
| `/admin/plans` | Plans with Linked Product | `0.20ms` | `1,272.8ms` | **PASS (<1.5s)** |
| `/admin/staff` | Staff Access List | `0.18ms` | `890.1ms` | **PASS (<1.5s)** |
| `/admin/taxes` | Tax Rules List | `0.15ms` | `910.1ms` | **PASS (<1.5s)** |
| `/admin/payment-terms` | Payment Terms List | `0.14ms` | `1,056.5ms` | **PASS (<1.5s)** |
| `/admin/discounts` | Discount Rules List | `0.19ms` | `891.5ms` | **PASS (<1.5s)** |
| `/admin/quotation-templates` | Template Builder List | `0.24ms` | `1,373.1ms` | **PASS (<1.5s)** |
| `/portal` | Customer Isolated Dashboard | `0.28ms` | `1,255.9ms` | **PASS (<1.5s)** |
