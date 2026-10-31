# Brightloop SMS — 5-Minute Product Demonstration Script

A step-by-step walkthrough script for hackathon evaluators and demo presentations, showcasing all core business flows, state machine governance, automated idempotency, multi-tenant portal isolation, and finance reporting.

---

## Demo Overview & Pre-requisites

- **Platform URL**: `http://localhost:3000`
- **Recommended Browser**: Google Chrome or Chromium
- **Pre-seeded High-Volume Dataset**: 50 Customers, 2,008 Subscriptions, 5,012 Invoices, 3,535 Payments
- **Total Presentation Time**: 5 Minutes

---

## Scene 1: Introduction & Architecture (30 Seconds)

**Presenter Script:**
> *"Good morning. Welcome to Brightloop SMS, the unified subscription lifecycle and automatic billing platform designed for SaaS companies like Brightloop Software.*
>
> *Unlike fragmented systems that stitch together disparate billing and CRM tools, Brightloop SMS runs the complete lifecycle in one platform: from variant-aware product pricing and quotation templates, to state-machine-governed contracts, idempotent billing cron runs, multi-tenant customer self-service, and real-time MRR finance analytics.*
>
> *Let's jump into the live application."*

---

## Scene 2: Product Catalog, Brand Variants & Plan Governance (45 Seconds)

**Presenter Actions:**
1. Navigate to `/login`.
2. Sign in with Admin credentials:
   - **Email**: `admin@brightloop.test`
   - **Password**: `Admin@12345`
3. Click **Products** in the left sidebar (`/admin/products`):
   - Highlight the 3 seeded products: *BrightERP Cloud Core*, *Dedicated Cloud Server Node*, *Priority Implementation & Consulting*.
   - Click **Edit** on *BrightERP Cloud Core* to open the slide-over Sheet:
     - Point out the **Cost Price**, **Sales Price**, and live **Gross Margin** indicator.
     - Show the **Attribute Variants**: Brand = `Odoo` with an extra price of `+₹560`.
     - Point out the **Live Effective Price Preview** (`₹2,499` + `₹560` = `₹3,059`).
4. Click **Plans** in the left sidebar (`/admin/plans`):
   - Highlight plans across all billing frequencies: *Daily Sandbox Testing*, *Weekly Starter Sprint*, *Professional Business Monthly*, and *Enterprise Growth Annual*.
   - Point out the derived status badges (*Available*, *Upcoming*, *Ended*).
   - Highlight the 4 lifecycle policy flags: `autoClose`, `closable`, `pausable`, and `renewable`.

---

## Scene 3: Quotation Templates & Subscription Lifecycle (60 Seconds)

**Presenter Actions:**
1. Click **Templates** (`/admin/quotation-templates`):
   - Show *SaaS Professional Onboarding Package*.
   - Click the **Duplicate** action: note the instantaneous copy created with line items pre-preserved.
2. Click **Subscriptions** (`/admin/subscriptions`) → **New Subscription**:
   - Select Customer: `Acme Corp` (`customer1@brightloop.test`).
   - Select Plan: *Professional Business Monthly*.
   - Select Template: *SaaS Professional Onboarding Package*.
   - Notice that line items, variant pricing, and GST 18% taxes are instantly calculated and filled.
   - Click **Create Subscription**.
3. Detail View & State Machine Stepper:
   - Notice the sequential contract number generated inside an atomic database sequence (`SUB-00001` format).
   - Point out the **Visual Progress Stepper**: `DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED`.
   - Click **Send Quotation** (`DRAFT` → `QUOTATION`).
   - Click **Confirm Contract** (`QUOTATION` → `CONFIRMED`).
   - Click **Activate Subscription** (`CONFIRMED` → `ACTIVE`).
   - Click **Pause Subscription**: contract smoothly enters the reversible `PAUSED` state.
   - Click **Resume Subscription**: contract returns to `ACTIVE`.
   - Scroll down to the **Audit Timeline**: every single transition records who changed it, from what state, and the exact timestamp.

---

## Scene 4: Automated Billing Engine & Idempotency Proof (60 Seconds)

**Presenter Actions:**
1. Click **Billing Engine** (`/admin/billing-run`):
   - Highlight the engine specifications: batch processing, automatic catch-up of missed billing periods, and auto-application of eligible discounts.
2. Click **"Run Automated Invoicing Now"**:
   - The engine processes all due contracts and pops open the execution modal:
     - `Created: X invoices`
     - `Skipped: 0`
     - `Failures: 0`
3. **Prove Idempotency**:
   - Immediately click **"Run Automated Invoicing Now"** a second time.
   - Point out the modal result:
     - `Created: 0 invoices`
     - `Skipped: 0`
     - `Failures: 0`
   - *Presenter note: "Our database enforces a strict composite constraint on `(subscriptionId, periodStart)`. No contract can ever be billed twice, even under concurrent cron triggers."*
4. Click **Invoices** (`/admin/invoices`):
   - Click the first confirmed invoice to view its detailed breakdown:
     - Customer snapshot, period start/end, payment due date from payment terms.
     - Line items, tax breakdown, auto-applied discount savings.
   - Click **Print Invoice**: displays the clean, printer-friendly company tax receipt.

---

## Scene 5: Payments & Automatic Settlement (45 Seconds)

**Presenter Actions:**
1. On the invoice detail page, click **Record Payment**:
   - Payment Dialog opens with pre-filled default balance.
   - Select Method: `UPI` (or `CARD`, `BANK_TRANSFER`).
   - Enter a **partial amount** (e.g., ₹1,000 of ₹3,059).
   - Click **Record Payment**.
2. Notice the live payment table:
   - Partial payment recorded with date, method, and transaction note.
   - Invoice balance decreases to ₹2,059; status remains `CONFIRMED`.
3. Click **Record Payment** a second time:
   - Amount defaults to the remaining balance (₹2,059).
   - Select Method: `BANK_TRANSFER`.
   - Click **Record Payment**.
4. **Auto-Settlement**:
   - The invoice balance reaches ₹0.00 and automatically flips to `PAID` within the same atomic database transaction.

---

## Scene 6: Customer Portal & Multi-Tenant Isolation (45 Seconds)

**Presenter Actions:**
1. Click **Logout** in the top navigation bar.
2. Log in as a customer:
   - **Email**: `customer1@brightloop.test`
   - **Password**: `Customer@12345`
3. **Customer Dashboard** (`/portal`):
   - Displays tenant-specific active subscriptions, next billing date, and total amount due.
   - Fully responsive design: test on mobile or shrink window width to demonstrate the collapsible navigation drawer.
4. Click **My Subscriptions**:
   - Open subscription detail: customers can only perform actions allowed by their plan flags (`Pause`, `Renew`, `Close`).
5. **Prove Tenant Isolation**:
   - In the browser address bar, deliberately alter the subscription or invoice ID to a foreign customer's UUID.
   - Notice the application renders a clean **HTTP 404 Not Found** page.
   - *Presenter note: "Our server actions strictly verify `customerId === session.userId`. Foreign tenant data is completely invisible and unreachable by URL tampering."*

---

## Scene 7: Finance Dashboard & Performance at Scale (30 Seconds)

**Presenter Actions:**
1. Log back in as Admin (`admin@brightloop.test`).
2. Lands directly on **Reports & MRR** (`/admin/reports`):
   - Show the 6 summary cards:
     - **Active Subscriptions**: 1,304
     - **MRR (Monthly Recurring Revenue)**: Mathematically normalized across daily, weekly, monthly, and yearly cadences.
     - **Revenue Collected in Range**
     - **Outstanding Amount**
     - **Overdue Invoices & Amount**
   - Point out the **Revenue-by-Month Area Chart** (6-month historical trend) and **Subscriptions-by-Status Bar Chart**.
   - Show the **Date Range Presets**: *This Month*, *Last Month*, *This Quarter*, *Custom Range*.
   - Show the **Streaming CSV Export**: Click **Export Overdue Invoices (CSV)** and **Export Payments (CSV)**; downloads start instantly.
3. **Performance Highlight**:
   - Point out the green query speed pill in the header:
   - *Presenter note: "All metrics and charts were computed directly by PostgreSQL using pure SQL aggregates across more than 2,000 subscriptions and 5,000 invoices in under 1 second, without loading rows into JavaScript memory."*

---

## Wrap-Up & Closing (15 Seconds)

> *"Brightloop SMS delivers enterprise-grade reliability, strict financial correctness, and lightning-fast responsiveness under high transaction volumes. Thank you for your time, and we'd be glad to take any questions."*
