# PROGRESS.md: Progression Log

Agents: read this BEFORE every response. After every response append a new entry at the bottom of the LOG section and tick the checklist.

## Current status
- Current phase: Phase 3 (Complete, ready for Phase 4: Subscriptions)
- Last updated: 2026-10-31 11:48 IST
- Blockers: none
- Waiting on user: none

## Decisions and assumptions
1. Plan price pre-fills unit price for lines matching the plan's linked product; otherwise product effective price (salesPrice + variant extraPrice) is used.
2. Quotations and Subscriptions share the same underlying entity: a quotation is a Subscription record in `QUOTATION` (or `DRAFT`) status, transitioning directly through the state machine.
3. Advance billing model: Subscriptions bill in advance on `startDate` for the upcoming period `[periodStart, periodEnd]`, setting `nextInvoiceDate` accordingly.
4. Discount precedence: Product-level discounts apply to matching lines first, then subscription-wide discounts apply to the resulting subtotal; total cannot fall below zero.
5. Workspace root resolution: Scaffold initialized at repository root `d:/Projects/Makeaton` with `.env.example` tracked and `.env.local` secured.

## Phase checklist
### Phase 0: Scaffold
- [x] Next.js + TS + Tailwind + shadcn/ui installed
- [x] Prisma connected to Postgres
- [x] Base layout shell and theme tokens
### Phase 1: Foundation and Auth
- [x] Full Prisma schema + migration
- [x] Signup with password rules, unique email
- [x] Login/logout, JWT cookie, middleware
- [x] Forgot/reset password via email
- [x] RBAC helpers + admin-only staff creation
- [x] Seed admin user
### Phase 2: Catalog
- [x] Products CRUD + variants
- [x] Plans CRUD + flags + availability dates
### Phase 3: Taxes, Discounts, Templates
- [x] Tax rules CRUD
- [x] Payment terms CRUD
- [x] Discount rules CRUD (admin only)
- [x] Quotation templates CRUD
### Phase 4: Subscriptions
- [ ] Create from scratch and from template
- [ ] Lines with tax/price calc
- [ ] State machine + stepper + history
- [ ] List with filters and pagination
### Phase 5: Billing and Invoices
- [ ] Billing engine (idempotent, catch-up)
- [ ] Discount auto-application
- [ ] Invoice list/detail, confirm/cancel/send/print
- [ ] Billing run UI + secured cron endpoint
### Phase 6: Payments and Portal
- [ ] Record payments, auto-mark Paid
- [ ] Paid/outstanding/overdue views
- [ ] Customer portal (subscriptions, invoices, manage)
### Phase 7: Reporting and Performance
- [ ] Finance dashboard with filters
- [ ] Indexes + query tuning, pages < 2s
- [ ] CSV export
### Phase 8: Polish and Ship
- [ ] 2,000 subs / 5,000 invoices seed
- [ ] UI polish pass, empty/loading/error states
- [ ] README, deploy, demo script

## LOG
### Entry template
[#N | Phase X | timestamp]
- Request: (one line)
- Done: (bullets)
- Files touched: (list)
- Verification: (lint/typecheck/build/browser result)
- Next: (single next action)
- Blockers / manual checkpoint: (or none)

(entries below)

[#1 | Phase 0 | 2026-10-31 09:45 IST]
- Request: Read MASTER.md and PROGRESS.md, summarise core rules, record decisions/ambiguities, log first entry, do not write code yet.
- Done:
  - Read and confirmed MASTER.md and PROGRESS.md protocols.
  - Summarised RBAC roles, subscription status flow, invoice status flow, and idempotency rules into 8 bullets.
  - Recorded initial architectural decisions and potential ambiguities in PROGRESS.md.
  - Initialized progress log.
- Files touched:
  - docs/PROGRESS.md
- Verification: Documents reviewed and validated against hackathon requirements; no code written.
- Next: Awaiting Phase 0 prompt to begin project scaffolding.
- Blockers / manual checkpoint: none

[#2 | Phase 0 | 2026-10-31 09:53 IST]
- Request: Scaffold Phase 0: Next.js + TS + Tailwind + dependencies + shadcn/ui + tokens + app shell + Prisma setup.
- Done:
  - Repositioned git repository to project root to allow standard tracking.
  - Resolved npm package naming restriction by initializing Next.js App Router scaffold into temporary directory `temp-app`.
  - Monitored `create-next-app` package installation currently in flight.
- Files touched:
  - docs/PROGRESS.md
- Verification: Background installation running cleanly without errors.
- Next: Move scaffold to root, install remaining dependencies, configure shadcn/ui, theme tokens, Prisma and app shell.
- Blockers / manual checkpoint: none

[#3 | Phase 0 | 2026-10-31 10:11 IST]
- Request: Complete Phase 0 tasks: scaffold, shadcn/ui/lucide/recharts/prisma/date-fns stack, theme tokens, app shell, Prisma datasource, lib/money.ts, lib/format.ts, placeholder dashboard page, lint/typecheck/build/browser verification, commit.
- Done:
  - Scaffolded Next.js App Router project in repository root with TypeScript strict, Tailwind CSS, ESLint, and added `typecheck` script.
  - Installed all required production and dev packages: `lucide-react`, `recharts`, `zod`, `react-hook-form`, `@hookform/resolvers`, `bcryptjs`, `jose`, `nodemailer`, `prisma`, `@prisma/client`, `date-fns`, `@types/bcryptjs`, `@types/nodemailer`.
  - Configured design system tokens in `app/globals.css` with neutral slate palette, indigo-600 primary color, and Inter typography via `next/font/google`.
  - Built reusable App Shell layout: `Sidebar` (role-aware navigation with active route highlights), `Topbar` (search and user status), `PageHeader` (title, description, badge, primary action slots), and `StatusBadge` matching exact color map from MASTER §6.
  - Configured `prisma/schema.prisma` with `DATABASE_URL` (PgBouncer connection pooling) and `DIRECT_URL`.
  - Created `.env.example` with sanitized placeholders and confirmed `.gitignore` strictly protects `.env*` files.
  - Created `lib/money.ts` providing half-up 2-decimal rounded arithmetic and line total calculations.
  - Created `lib/format.ts` for localized INR currency formatting and `date-fns` based date/time formatting.
  - Built placeholder dashboard page (`app/page.tsx`) showcasing metrics, status badge token matrix, and stack health checklist.
  - Verified `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (0 errors), `npm run build` (production build succeeded in 769ms).
  - Verified dashboard in browser agent at `http://localhost:3000` with 0 console errors.
- Files touched:
  - .gitignore
  - .env.example
  - package.json
  - tsconfig.json
  - prisma/schema.prisma
  - app/globals.css
  - app/layout.tsx
  - app/page.tsx
  - components/layout/app-shell.tsx
  - components/layout/sidebar.tsx
  - components/layout/topbar.tsx
  - components/ui/page-header.tsx
  - components/ui/status-badge.tsx
  - lib/utils.ts
  - lib/prisma.ts
  - lib/money.ts
  - lib/format.ts
  - docs/PROGRESS.md
- Verification: Lint, typecheck, build pass with 0 errors. Browser subagent verified full dashboard layout at localhost:3000.
- Next: Commit Phase 0 changes. Awaiting Phase 1 prompt.
- Blockers / manual checkpoint: none

[#4 | Phase 0 | 2026-10-31 10:14 IST]
- Request: Push to GitHub repository https://github.com/DilshanCheerangan/Subscription_Management_system.
- Done:
  - Configured git remote origin to https://github.com/DilshanCheerangan/Subscription_Management_system.git.
  - Attempted `git push -u origin main`.
  - Hit 403 authorization error: local git is authenticated as `HafizHussain24`, which does not have write access to `DilshanCheerangan/Subscription_Management_system`.
- Files touched:
  - docs/PROGRESS.md
- Verification: Git remote verified; push blocked by GitHub permission 403.
- Next: User grants collaborator write access to `HafizHussain24` or supplies personal access token/credentials to push.
- Blockers / manual checkpoint: MANUAL CHECKPOINT for GitHub push authorization.

[#5 | Phase 0 | 2026-10-31 10:17 IST]
- Request: Clarify pushing with collaborator GitHub account without affecting Gemini/Antigravity account.
- Done:
  - Explained that Git command-line credentials and Gemini Pro IDE credentials are completely separate.
  - Provided direct solutions: Personal Access Token (PAT) for collaborator account or git credential re-authentication.
- Files touched:
  - docs/PROGRESS.md
- Verification: Clarification provided; awaiting user action on collaborator push or Phase 1 prompt.
- Next: User configures collaborator push, or provides Phase 1 prompt.
- Blockers / manual checkpoint: none

[#6 | Phase 0 | 2026-10-31 10:20 IST]
- Request: Push to GitHub repository using personal access token.
- Done:
  - Securely used collaborator Personal Access Token to push local `main` branch directly to remote repository `https://github.com/DilshanCheerangan/Subscription_Management_system.git`.
  - Configured remote tracking upstream (`branch 'main' set up to track 'origin/main'`).
  - Verified remote repository synchronization with 0 secrets stored in code or logs.
- Files touched:
  - docs/PROGRESS.md
- Verification: `git push -u origin main` succeeded with all 30 files from Phase 0 cleanly pushed.
- Next: Awaiting Phase 1 prompt to begin Foundation and Auth.
- Blockers / manual checkpoint: none

[#7 | Phase 1 | 2026-10-31 10:34 IST]
- Request: Phase 1: Complete Prisma schema for entire system, Auth & RBAC (bcryptjs, jose JWT, httpOnly cookie), Password validator & real-time rules checklist, Auth pages (/signup, /login, /forgot-password, /reset-password/[token]), Admin-only /admin/staff page, seed script, middleware protection, stop at manual checkpoint for migration & seed.
- Done:
  - Wrote comprehensive `prisma/schema.prisma` covering all 18 models and enums with `Decimal(12,2)` precision and MASTER §5 indexes.
  - Built `lib/auth.ts` (bcryptjs hashing, jose JWT signing/verification, httpOnly cookie session management).
  - Built `lib/rbac.ts` (`requireUser`, `requireRole` guards enforcing 3-tier RBAC).
  - Built `lib/validators/password.ts` (shared client/server validator and real-time rule breakdown checker).
  - Built `lib/mail.ts` (nodemailer SMTP transporter with dev console fallback).
  - Built `middleware.ts` with route protection for `/admin/*`, `/portal/*`, and authenticated user redirects.
  - Implemented `app/actions/auth.ts` (signup, login, logout, forgotPassword with 30-min token hash, resetPassword).
  - Created neat centered `AuthCard` layout and `PasswordRulesChecklist` component.
  - Created `/signup` (CUSTOMER only), `/login`, `/forgot-password`, and `/reset-password/[token]`.
  - Built admin-only `/admin/staff` page and server actions to list and provision STAFF users.
  - Created `prisma/seed.ts` upserting system admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` and initial sequence numbers.
  - Added `db:migrate`, `db:seed`, and `prisma.seed` in `package.json`.
  - Verified `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (0 errors), `npm run build` (all 11 routes compiled cleanly).
- Files touched:
  - prisma/schema.prisma
  - prisma/seed.ts
  - package.json
  - package-lock.json
  - middleware.ts
  - lib/auth.ts
  - lib/rbac.ts
  - lib/mail.ts
  - lib/validators/password.ts
  - components/auth/auth-card.tsx
  - components/auth/password-rules-checklist.tsx
  - components/layout/topbar.tsx
  - app/actions/auth.ts
  - app/actions/staff.ts
  - app/(auth)/signup/page.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/forgot-password/page.tsx
  - app/(auth)/reset-password/[token]/page.tsx
  - app/(admin)/admin/page.tsx
  - app/(admin)/admin/staff/page.tsx
  - app/(portal)/portal/page.tsx
  - app/page.tsx
  - docs/PROGRESS.md
- Verification: Lint (0 problems), typecheck (0 errors), build (11 static/hybrid routes compiled successfully).
- Next: Execute database migration and seed commands (MANUAL CHECKPOINT).
- Blockers / manual checkpoint: MANUAL CHECKPOINT for migration & seed execution.

[#8 | Phase 1 | 2026-10-31 10:44 IST]
- Request: Resolve seed error "Environment variable not found: DATABASE_URL".
- Done:
  - Diagnosed that Prisma CLI requires `.env` or explicit dotenv loading, which was missing when the user ran `npm run db:seed` in their terminal.
  - Added explicit `dotenv` loading to `prisma/seed.ts` (loading `.env.local` then `.env`).
  - Synchronized `.env` from `.env.local` (both protected by `.env*` in `.gitignore`).
  - Corrected `package.json` scripts: `db:migrate` to `prisma migrate dev` and `db:seed` to `prisma db seed`.
  - Applied migration `20261031050938_init_system_schema` to Supabase PostgreSQL database.
  - Executed `npm run db:seed` successfully:
    - Upserted System Admin: `admin@brightloop.test` (role: `ADMIN`, password: `Admin@12345`).
    - Seeded sequential number counters for `SUBSCRIPTION` (SUB-00001) and `INVOICE` (INV-00001).
    - Seeded default Payment Terms (`Immediate`, `15 Days`, `30 Days`).
  - Verified database state via Prisma Client: Admin password verification against `Admin@12345` returned `true`.
  - Re-ran and verified: `npm run lint` (0 errors), `npm run typecheck` (0 errors), `npm run build` (11 routes compiled cleanly).
- Files touched:
  - package.json
  - package-lock.json
  - prisma/seed.ts
  - prisma/migrations/20261031050938_init_system_schema/migration.sql
  - docs/PROGRESS.md
- Verification: `npm run lint`, `npm run typecheck`, and `npm run build` passed with zero errors. `npm run db:seed` completed cleanly with exit code 0.
- Next: Awaiting Phase 2: Catalog prompt (Products, Variants, Plans, Flags).
- Blockers / manual checkpoint: none

[#9 | Phase 1 | 2026-10-31 10:53 IST]
- Request: How to verify if Mailtrap is working.
- Done:
  - Created `scripts/test-mail.ts` diagnostic verification script that verifies SMTP credentials via `transporter.verify()` and dispatches a test message.
  - Added `npm run test:mail` script to `package.json`.
  - Documented two testing approaches: (1) CLI via `npm run test:mail`, and (2) App UI via `/forgot-password` flow.
  - Verified `npm run lint` (0 errors) and `npm run typecheck` (0 errors).
- Files touched:
  - scripts/test-mail.ts
  - package.json
  - docs/PROGRESS.md
- Verification: `npm run test:mail` runs properly and validates environment variable presence; `npm run lint` and `npm run typecheck` pass with 0 errors.
- Next: Awaiting Phase 2: Catalog prompt (Products, Variants, Plans, Flags).
- Blockers / manual checkpoint: none

[#10 | Phase 1 | 2026-10-31 10:57 IST]
- Request: Resolve error in `npm run test:mail` indicating missing SMTP credentials.
- Done:
  - Identified that Mailtrap credentials were added to `.env`, but `.env.local` still contained empty SMTP variables (`""`).
  - Next.js and `dotenv` prioritize `.env.local` over `.env`, causing empty strings to mask the credentials in `.env`.
  - Synchronized the Mailtrap SMTP credentials from `.env` into `.env.local`.
  - Ran `npm run test:mail` and confirmed:
    - Connection to `sandbox.smtp.mailtrap.io:2525` verified successfully.
    - Test email delivered to Mailtrap with Message ID `<a43ad6c6-c20a-5ad0-0b10-3d152962bae4@brightloop.test>`.
  - Verified `npm run lint` (0 errors), `npm run typecheck` (0 errors), and confirmed `.env*` remains strictly gitignored.
- Files touched:
  - docs/PROGRESS.md
- Verification: `npm run test:mail` returned exit code 0; test email visible in Mailtrap inbox.
- Next: Awaiting Phase 2: Catalog prompt (Products, Variants, Plans, Flags).
- Blockers / manual checkpoint: none

[#11 | Phase 2 | 2026-10-31 11:22 IST]
- Request: Implement Phase 2: Products, variants and plans (ADMIN only for writes; STAFF read-only).
- Done:
  - Created Zod validation schemas (`lib/validators/catalog.ts`) for Products, Variants, and Plans with `availableTo > availableFrom` date refinement.
  - Built `app/actions/products.ts` with paginated retrieval, search, type filtering, margin calculation, variant synchronization, and `requireRole(["ADMIN"])` mutation protection.
  - Built `app/actions/plans.ts` with pagination, billing cycle filtering, product linking, flag persistence, and `requireRole(["ADMIN"])` guard.
  - Implemented `lib/catalog.ts` containing the synchronous `derivePlanStatus` calculation (`Upcoming`, `Available`, `Ended`).
  - Created reusable UI components:
    - `components/ui/sheet.tsx`: Slide-over drawer with backdrop, responsive sizing, and accessible keyboard dismissal.
    - `components/catalog/plan-status-badge.tsx`: Consistent status pill badges with distinct colors (Upcoming=blue, Available=emerald, Ended=slate).
    - `components/catalog/product-form-sheet.tsx`: Product editor with live margin indicator, dynamic variant builder, and customer-facing effective price preview.
    - `components/catalog/plan-form-sheet.tsx`: Plan editor with instant date ordering validation and the four required lifecycle switches (`autoClose`, `closable`, `pausable`, `renewable`).
    - `components/dashboard/dashboard-content.tsx`: Extracted dashboard view for reusability.
  - Built responsive data table pages:
    - `app/(admin)/admin/products/page.tsx`: Search, type filter, status filter, margin indicators, variants count, pagination, and role-aware action controls.
    - `app/(admin)/admin/plans/page.tsx`: Search, billing cycle filter, linked product references, derived status badge, lifecycle flag tags, pagination, and role-aware action controls.
  - Unified app navigation & RBAC:
    - Created `app/(admin)/layout.tsx` wrapping all admin pages in `AppShell` with Next.js Partial Prerendering `<Suspense>` boundary.
    - Updated `components/layout/sidebar.tsx` with dedicated `/admin/products` and `/admin/plans` links visible to both ADMIN and STAFF.
    - Added Read-Only banner for STAFF users; hidden and server-blocked all write/edit/delete actions when logged in as STAFF.
  - Verified end-to-end functionality, calculations, date validation, and status derivations with automated integration tests.
  - Verified `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (0 errors), and `npm run build` (14 routes cleanly compiled).
- Files touched:
  - lib/validators/catalog.ts
  - lib/catalog.ts
  - app/actions/products.ts
  - app/actions/plans.ts
  - components/ui/sheet.tsx
  - components/catalog/plan-status-badge.tsx
  - components/catalog/product-form-sheet.tsx
  - components/catalog/plan-form-sheet.tsx
  - components/dashboard/dashboard-content.tsx
  - components/layout/sidebar.tsx
  - app/(admin)/layout.tsx
  - app/(admin)/admin/page.tsx
  - app/(admin)/admin/staff/page.tsx
  - app/(admin)/admin/products/page.tsx
  - app/(admin)/admin/plans/page.tsx
  - app/api/auth/me/route.ts
  - app/page.tsx
  - docs/PROGRESS.md
- Verification: Lint (0 problems), typecheck (0 errors), build (14 routes succeeded in 369ms).
- Next: Awaiting Phase 3: Taxes, Discounts, Templates prompt.
- Blockers / manual checkpoint: none

[#12 | Protocol Update | 2026-10-31 11:24 IST]
- Request: Omit browser navigation / subagent testing moving forward to accelerate delivery; rely on CLI checks and prompt user for any needed verifications.
- Done:
  - Acknowledged and adopted rule: browser subagent navigation is disabled.
  - Fast CLI checks (`npm run lint`, `npm run typecheck`, `npm run build`, automated script tests) will remain the sole automated gate.
  - Any required visual checkpoints will be outlined clearly for the user to review.
- Files touched:
  - docs/PROGRESS.md
- Verification: Operating rule updated; working tree clean.
- Next: Awaiting Phase 3: Taxes, Discounts, Templates prompt.
- Blockers / manual checkpoint: none

[#13 | Git Guidance | 2026-10-31 11:26 IST]
- Request: How to configure and attribute Git commits to teammate collaborator credentials.
- Done:
  - Documented methods for:
    1. Setting repository-level author name and email (`git config user.name` / `user.email`).
    2. Overriding author on specific commits (`--author`).
    3. Adding GitHub co-author trailers (`Co-authored-by:`).
    4. Updating remote authentication token for pushes.
- Files touched:
  - docs/PROGRESS.md
- Verification: Guidance provided.
- Next: Awaiting Phase 3: Taxes, Discounts, Templates prompt.
- Blockers / manual checkpoint: none

[#14 | Phase 3 | 2026-10-31 11:48 IST]
- Request: PHASE 3: Configuration entities (ADMIN only) - Taxes, Payment Terms, Discounts (with live status badges & zod rules), Quotation Templates (with lines & Duplicate action), and seed demo data in prisma/seed.ts.
- Done:
  - Validations (`lib/validators/config.ts`):
    - `taxSchema`: name, percentage (0-100), fixedAmount, active.
    - `paymentTermSchema`: name, days (0=Immediate), active.
    - `discountSchema`: type (FIXED/PERCENTAGE), value, minPurchase, minQuantity, dates, usageLimit, scope (PRODUCT/SUBSCRIPTION), productIds; refined for percentage <= 100, endDate > startDate, productIds selection.
    - `quotationTemplateSchema` + lines: name, validityDays, planId, lines with product, variant, quantity, unitPrice, taxId.
  - Discount status helper (`lib/discounts.ts`) & Badge (`components/config/discount-status-badge.tsx`):
    - Derives `Scheduled`, `Active`, `Expired`, `Exhausted`, or `Inactive` with color-coded status badges.
  - Server Actions:
    - `app/actions/taxes.ts`: getTaxesAction, createTaxAction, updateTaxAction, toggleTaxActiveAction, deleteTaxAction (with reference checks).
    - `app/actions/payment-terms.ts`: getPaymentTermsAction, createPaymentTermAction, updatePaymentTermAction, togglePaymentTermActiveAction, deletePaymentTermAction (with subscription reference check).
    - `app/actions/discounts.ts`: getDiscountsAction, createDiscountAction, updateDiscountAction, toggleDiscountActiveAction, deleteDiscountAction (with invoice discount check).
    - `app/actions/quotation-templates.ts`: getQuotationTemplatesAction, createQuotationTemplateAction, updateQuotationTemplateAction, deleteQuotationTemplateAction, duplicateQuotationTemplateAction (copies lines with "(Copy)" suffix), getTemplateMetadataAction.
    - All mutations strictly guarded with `requireRole(["ADMIN"])`.
  - UI Pages & Form Sheets:
    - `/admin/taxes`: Data table with search, active filter, slide-over sheet (`TaxFormSheet`), role-aware read-only mode for STAFF.
    - `/admin/payment-terms`: Data table with dueDays schedules (Immediate=0, 15 Days, 30 Days), slide-over sheet (`PaymentTermFormSheet`), read-only for STAFF.
    - `/admin/discounts`: Data table with type, scope, validity dates, read-only usedCount/limit, live status badges, product multi-select in `DiscountFormSheet`, read-only for STAFF.
    - `/admin/quotation-templates`: Data table with linked plan, validity days, included items preview, `QuotationTemplateFormSheet` with dynamic line builder, and working **Duplicate (Copy)** action.
    - Sidebar (`components/layout/sidebar.tsx`): Added direct links to Taxes, Payment Terms, Discounts, and Templates.
  - Seed Demo Data (`prisma/seed.ts`):
    - 3 Products ("BrightERP Cloud Core", "Dedicated Cloud Server Node", "Priority Implementation & Consulting") with Odoo brand variant (`+560`).
    - 4 Plans across all billing periods (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) with availability dates and switches.
    - Standard Taxes: `GST 18%` and `GST 5%`.
    - Payment Terms: `Immediate`, `15 Days`, `30 Days`.
    - 2 Discounts: `WELCOME15` (15% Subscription), `ODOOPROMO500` (₹500 Product-level).
    - 2 Quotation Templates: "SaaS Professional Onboarding Package" and "Enterprise Cloud Infrastructure Bundle".
    - Executed seed script with exit code 0. Verified database counts: 2 taxes, 3 payment terms, 4 products, 8 variants, 5 plans, 2 discounts, 2 templates with 5 lines.
  - Verification:
    - `npm run lint`: 0 errors, 0 warnings.
    - `npm run typecheck`: 0 errors.
    - `npm run build`: Production build succeeded in 1.1s (all 18 routes compiled cleanly).
- Files touched:
  - lib/validators/config.ts
  - lib/discounts.ts
  - components/config/discount-status-badge.tsx
  - components/config/tax-form-sheet.tsx
  - components/config/payment-term-form-sheet.tsx
  - components/config/discount-form-sheet.tsx
  - components/config/quotation-template-form-sheet.tsx
  - app/actions/taxes.ts
  - app/actions/payment-terms.ts
  - app/actions/discounts.ts
  - app/actions/quotation-templates.ts
  - app/(admin)/admin/taxes/page.tsx
  - app/(admin)/admin/payment-terms/page.tsx
  - app/(admin)/admin/discounts/page.tsx
  - app/(admin)/admin/quotation-templates/page.tsx
  - components/layout/sidebar.tsx
  - prisma/seed.ts
  - docs/PROGRESS.md
- Verification: Lint (0 problems), typecheck (0 errors), build (18 routes compiled successfully).
- Next: Awaiting Phase 4: Subscriptions prompt.
- Blockers / manual checkpoint: none





