# DaruBahi — Product Requirements Document

## Original Problem Statement
Mobile app for a liquor store's inventory & sales management. Smoothly add liquor
categories (Beer, Wine, Whisky, Rum, Desi) and, under each, brands with bottle sizes
and count of sale. Maintain a record of every sale and generate full reports per day
and per brand. Login/Signup must work perfectly; each shop owner has an individual
account. Shop types: Composite (FL+BB), Desi, Desi+Beer. Per-product daily entry
tracks previous/new/total stock, quantity sold, rate, amount, cost/unit, margin,
profit and remaining stock. Monthly report shows sales of month, total profit,
top 5 brands, and remaining stock.

## Architecture
- **Frontend:** Expo Router (React Native), Plus Jakarta Sans (bundled), warm amber
  "ledger" theme. Bottom tabs: Home, Catalog, Reports, More. Modal routes for Sell,
  Daily Entry, Add/Edit Product. Auth via JWT stored in secure storage.
- **Backend:** FastAPI + MongoDB (motor). All routes under `/api`. UUID string IDs,
  `_id` excluded from responses.
- **Auth:** Mobile + OTP via Twilio Verify. Dev fallback returns OTP in response if
  Twilio send fails. Reserved QA number `9999999999` always accepts OTP `123456`.

## User Personas
- **Shop Owner (primary):** Non-technical liquor retailer who records daily sales and
  checks day/month profit on a phone.

## Core Requirements (static)
1. OTP login/signup, one account per mobile number (shop).
2. Category + brand/product catalog with sizes, cost & selling price, stock.
3. Record sales (decrement stock, compute profit).
4. Daily stock entry (opening + added − sold − damaged = closing).
5. Daily & Monthly reports (totals, brand-wise, top 5, category-wise, remaining stock).

## Implemented (2026-07-01)
- Mobile OTP auth (Twilio + dev/QA fallback), shop setup, JWT session, logout.
- Categories (8 presets + custom), Products CRUD (soft delete), category filter.
- Sell Bottle flow with stepper + live amount/profit; stock validation.
- Daily Entry flow with live closing-stock calc; auto-records sale when sold>0.
- Dashboard (today/month sale & profit, bottles, low stock, top sellers, recent sales, FAB).
- Reports: Daily (brand-wise) and Monthly (top 5 brands, category profit, remaining stock/value).
- Full test coverage: backend 18/18 pytest, frontend E2E all green.

## Backlog / Remaining
- **P1:** Editable/cancellable sales & sale corrections (existed in reference app).
- **P1:** Expenses tracking + net profit (sales profit − expenses).
- **P2:** Date-range picker for reports; export/share report (PDF/CSV).
- **P2:** Employee role with restricted (no-reports) access.
- **P2:** Clean RN-web console warnings (shadow* → boxShadow, pointerEvents).

## Next Tasks
1. Add Expenses module and net-profit metric on dashboard/reports.
2. Add sale edit/cancel with stock restore.
3. Add report date/month picker + share/export.
