# MASTER.md: Agent Operating Manual (Brightloop Subscription Management System)

## 0. Mission
Build ONE unified platform that runs the full life of a subscription business: products and plans, quotations, subscriptions, automatic invoicing, taxes, discounts, payments, customer portal and finance reporting. Company: Brightloop Software (monthly/yearly SaaS, add-ons, product variants). Deadline: 8-hour hackathon. Speed AND correctness AND a clean professional UI.

## 1. Agent protocol (MANDATORY, every response)
1. BEFORE doing anything: read docs/MASTER.md and docs/PROGRESS.md fully. Resume from the first unchecked item in PROGRESS.md.
2. Work only on the CURRENT phase. Do not start the next phase until the user says so.
3. AFTER every response: append a log entry to docs/PROGRESS.md (format in that file), update the phase checklist, and note blockers and decisions.
4. When a step needs a human action (accounts, secrets, database console, deploy, third-party dashboards), STOP and print a block starting with: MANUAL CHECKPOINT, followed by numbered steps and what you need back. Do not guess or fake credentials.
5. Before declaring a phase done, run: npm run lint, npm run typecheck, npm run build. Fix failures. Then verify the main flow in the browser agent and summarise the evidence.
6. Make small, working increments. Commit at the end of each logical unit with a clear message (feat:, fix:, chore:).
7. If a requirement is ambiguous, pick the simplest reasonable interpretation, record it under Decisions in PROGRESS.md, and continue. Ask the user only if blocked.
8. Never put secrets in code or logs. Never commit .env files.

## 2. Tech stack (fixed, do not change)
- Next.js 14+ (App Router) + TypeScript (strict) in a single repo
- Tailwind CSS + shadcn/ui + lucide-react icons + Recharts
- PostgreSQL + Prisma ORM
- Auth: email/password, bcrypt hashing, signed JWT in httpOnly cookie (jose), middleware for route protection
- Validation: zod on every API input and every form (react-hook-form + zodResolver)
- Email: nodemailer via SMTP env vars
- Tables: server-side pagination, sorting and filtering via URL search params
- Money: Prisma Decimal(12,2); do arithmetic with a single helper (lib/money.ts) and round half-up at line level; display currency via Intl.NumberFormat, default INR (symbol rupee), configurable constant.

## 3. Roles and access (RBAC)
- ADMIN: everything. The only role that can create staff, products, plans, taxes, discounts, payment terms.
- STAFF: day-to-day work: customers, quotations, subscriptions, invoices, payments, reports (read). No config pages, no staff creation.
- CUSTOMER: portal only; sees ONLY their own subscriptions and invoices; can view and manage their own subscription (pause/renew/close where the plan allows) and see payment status.
Enforce RBAC in THREE places: middleware (routes), server actions/API handlers (guard helper requireRole), and UI (hide what is not allowed). Customers must never be able to read another customer's data by changing an ID (always filter by session user).

## 4. Business rules (source of truth)
### Accounts
- Email is unique (case-insensitive). Password: more than 8 characters (min 9), at least one uppercase, one lowercase, one special character. Same validator on client and server.
- Public signup creates CUSTOMER only. Only ADMIN can create STAFF.
- Forgot password: generate a single-use token (store only its hash, expires in 30 min), email a reset link to the registered email. Always respond with the same message whether or not the email exists.

### Catalog
- Product: name, type (SERVICE | GOODS | SOFTWARE), salesPrice, costPrice, notes, active.
- Variants: product has attribute (e.g. Brand) with values and an extraPrice (e.g. Odoo = +560). Effective unit price = salesPrice + selected variant extraPrice.
- Plan: name, price, billingPeriod (DAILY | WEEKLY | MONTHLY | YEARLY), minQuantity, availableFrom, availableTo, optional linked product, and admin-decided flags per plan: autoClose (closes by itself at availableTo/expiry), closable (can be closed early), pausable, renewable. UI and API must respect these flags.
- Plan price pre-fills the unit price of a line whose product is the plan's linked product; otherwise use product effective price.

### Quotation templates
- name, validityDays, plan, product lines. Creating a quotation from a template copies lines and sets validUntil = today + validityDays.

### Subscriptions
- Number auto-generated: SUB-00001 style, unique, sequential.
- Fields: customer, plan, startDate, expiryDate, paymentTerm (e.g. Immediate, 15 Days, 30 Days), nextInvoiceDate, lines (product, variant, quantity, unitPrice, tax, amount).
- Status flow: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED (plus PAUSED as a reversible side state from ACTIVE where plan allows). Enforce legal transitions in ONE state-machine helper; reject illegal ones. Show a status stepper and a history of transitions.
- Quantity must be >= plan.minQuantity.

### Taxes
- Admin-defined tax rules (name, percentage, optional fixed amount, active). Lines reference a tax. Totals = untaxed + tax - discount. Computed server-side only.

### Discounts
- Admin only. Type FIXED or PERCENTAGE, value, minPurchase, minQuantity, startDate, endDate, usageLimit, usedCount, scope PRODUCT (specific products) or SUBSCRIPTION (whole subscription).
- Applied AUTOMATICALLY when an invoice is generated if valid today and under usageLimit and thresholds met. Increment usedCount in the same DB transaction as invoice creation. Stops when expired or exhausted. Never let a discount push a total below zero.

### Invoices
- Created from a subscription by the billing engine (never typed by hand): customer, lines, taxes, discounts, totals, dueDate (from payment term), periodStart/periodEnd, number INV-00001.
- Status: DRAFT -> CONFIRMED -> PAID, plus CANCELLED. Actions: confirm, cancel, send (email), print (print-friendly page). OVERDUE is DERIVED (CONFIRMED, dueDate < today, balance > 0), never stored.
- IDEMPOTENCY (critical): unique constraint on (subscriptionId, periodStart). Billing engine uses a transaction per subscription, skips already-billed periods, and can be re-run safely. Nothing billed twice or skipped; if a run was missed, catch up each missed period in order.
- Billing run: admin/staff button AND secured endpoint /api/cron/billing (Bearer CRON_SECRET). Returns a summary: created, skipped, failed (with reasons).

### Payments
- Fields: invoice, method (CASH | BANK_TRANSFER | CARD | UPI | CHEQUE | OTHER), amount, paymentDate, note. Multiple partial payments allowed. Amount may not exceed balance. When sum(payments) >= total the invoice becomes PAID automatically (same transaction). Show paid / outstanding balance per invoice.

### Reporting (finance lead)
- One dashboard: active subscription count, revenue collected (payments) in range, outstanding amount, overdue invoices list, MRR (normalise yearly/weekly/daily to monthly), recent payments. Filters: date range, customer, plan, status. Summary cards + 1-2 charts + tables with CSV export.

## 5. Database and performance (every page under 2 seconds with thousands of rows)
- Indexes on: Subscription(status, customerId, nextInvoiceDate), Invoice(status, dueDate, customerId, subscriptionId), Payment(invoiceId, paymentDate), User(email unique).
- Always paginate (default 20). No unbounded findMany. No N+1: use include/select deliberately.
- Aggregations via Prisma groupBy/aggregate or raw SQL, never by loading rows into JS.
- Seed script must create at least 2,000 subscriptions and 5,000 invoices for performance testing (Phase 8).

## 6. UI/UX standard (clean, professional)
- Layout: fixed left sidebar (role-aware nav), top bar with search/user menu, content max-width container, page header with title + primary action.
- Look: light theme, neutral slate palette, ONE primary color (indigo-600), white cards with subtle border and soft shadow, 8px spacing grid, rounded-lg, Inter font. Optional dark mode only if time remains.
- Components: shadcn/ui only (Button, Card, Table, Dialog, Sheet, Select, Tabs, Badge, Toast, Skeleton, DropdownMenu, Form).
- Data tables: sticky header, filters row, pagination, column sorting, row actions menu, empty state with call to action, loading skeletons.
- Status badges (consistent everywhere): Draft=gray, Quotation=blue, Confirmed=indigo, Active=green, Paused=amber, Closed=slate, Paid=green, Overdue=red, Cancelled=gray-outline.
- Forms: inline validation messages, disabled submit while pending, toast on success/error, confirm dialog on destructive actions.
- States: every page has loading, empty and error states. No raw error dumps. No lorem ipsum. No emojis in the UI.
- Responsive down to tablet; customer portal must work on mobile.
- Accessibility basics: labels, focus rings, sufficient contrast.

## 7. Code standards
- Folder layout: app/(auth), app/(admin) for staff+admin, app/(portal) for customers, app/api, lib/ (auth, rbac, money, billing, state-machines, validators, mail), components/, prisma/.
- Business logic lives in lib/ services, not in components. API handlers stay thin.
- Every mutation: validate (zod) -> authorize -> execute (transaction if multi-write) -> return typed result.
- No `any`. No dead code. Meaningful names. Short comments only where logic is non-obvious.
- Maintain README.md with setup, env vars, seed credentials, billing run instructions, assumptions.

## 8. Definition of Done (per phase)
Checklist complete in PROGRESS.md, lint + typecheck + build pass, flow verified in browser, PROGRESS.md updated, work committed.