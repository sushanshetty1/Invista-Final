# Invista — Codebase Status, Pending Work and Future Scope

Generated: 2025-11-06

This document is an automated snapshot of the repository state focused on:
- what's already implemented,
- current blocking issues and known errors,
- concrete pending work (code TODOs / FIXMEs), and
- recommended next steps and future scope items.

It was created from local repository scans (CSS build diagnostics, source search for TODO/FIXME, and package manifest).

## 1) Quick summary

- Primary stack: Next.js (app router) + TypeScript + Tailwind CSS (v4) + Prisma + Supabase + Neon.
- Project is feature-rich: landing page, authentication, dashboard, inventory, suppliers, purchase orders, etc.
- Active work in this session centered on UI/responsivity and anchor scrolling; a CSS processing error blocks a full dev build verification.

## 2) Blockers / Critical issues (must fix before reliable build/run)

1. app/globals.css — PostCSS/Tailwind compile diagnostics
   - Errors reported by the local diagnostics tool (from CSS processor):
     - Unknown at rule `@custom-variant` (line ~4)
     - Unknown at rule `@theme` (line ~6)
     - Unknown at rule `@apply` (multiple lines, e.g. around line 121 and 128)
   - Context: the file uses advanced Tailwind-related at-rules and `@apply` inside `@layer base`. The tooling (Tailwind/PostCSS/biome) currently rejects these at-rules — likely configuration mismatch between Tailwind v4 and the PostCSS/biome pipeline or missing Tailwind plugin/processor step during linting.
   - Impact: CSS build/lint fails, preventing runtime verification of recent style changes (smooth scrolling, small breakpoint helpers, mobile overlay styles). Fixing this is high priority.

## 3) Findings — package.json & scripts

Relevant scripts (from `package.json`):

```powershell
npm run dev          # next dev
npm run build        # next build
npm run start        # next start
npm run lint         # next lint
npm run clear-cache  # node scripts/clear-cache.js
npm run dev:fresh    # clear-cache && dev
# Prisma helper scripts also present (db:generate, migrations, studio)
```

Dev workflow recommendation: fix CSS/Tailwind pipeline first, then run `npm run dev` and `npm run lint`.

## 4) What is already implemented (high level)

- Landing page and marketing flow with CTAs and anchors
- Authentication: login, signup, Google OAuth, password reset, account deletion
- Dashboard shell with charts and KPIs
- Inventory: product catalog UI, product form dialogs, category & brand management
- Supplier directory and some purchase order UI
- TypeScript and Prisma setup (dual schema: Neon + Supabase)
- A mobile-only "responsivity" overlay component and layout injection (added during the recent work)

Note: The above list mixes long-standing features and recent edits made during this session (mobile overlay, layout changes). All TSX edits reported no TypeScript errors when checked.

## 5) Repo TODO / FIXME audit (concrete items found)

I scanned the codebase for `TODO`, `FIXME`, and `XXX` markers and captured representative results and suggested priorities.

High priority (backend/functional)
- `app/api/invites/route.ts` — `// TODO: Send email notification here`
  - Suggested action: Hook to transactional email provider (SendGrid / Supabase mailer) when invites are created.
- `app/api/company-invites/route.ts` — `// TODO: Send email notifications here`
  - Suggested action: same as above.

Medium priority (data-integration / UI)
- `app/inventory/stock/page.tsx` — several TODOs:
  - `// TODO: Implement API call to fetch stock items with product and warehouse data`
  - `// TODO: Implement API call to fetch recent stock movements`
  - `// TODO: Implement API call to fetch warehouses`
  - `// TODO: Implement API call to fetch stock alerts`
  - Suggested action: implement server endpoints or client fetch hooks to populate these sections. Ensure pagination and filters are supported.
- `app/inventory/stock/page.tsx` — `{/* TODO: Implement top moving products chart */}`
  - Suggested action: wire chart component to aggregated data endpoint and sample data.

Low priority / housekeeping
- `app/purchase-orders/create/page.tsx` — `warehouseId: "default-warehouse", // TODO: Allow warehouse selection`
  - Suggested action: add warehouse select control and default behavior.
- `app/purchase-orders/page.tsx` — `approvedBy: "Current User", // TODO: Get from auth context`
  - Suggested action: pull user's display name or ID from Auth context.
- `prisma/generated/supabase/runtime/library.d.ts` — `// TODO: count does not actually exist in DMMF` (generated file)
  - Suggested action: ignore or regenerate Prisma client when necessary.

Notes:
- The `ProductFormDialog.tsx` file contains repeated UUID template code — not a TODO but items to possibly refactor.
- The scan returned 20 matches; there may be additional TODOs across the codebase to triage.

## 6) Concrete recommended next tasks (short-term)

1. Fix CSS processing pipeline (HIGH)
   - Why: build & lint fail due to `@apply` / unknown at-rules which block verifying UI changes.
   - How to approach (non-destructive):
     - Check Tailwind/PostCSS integration in project (postcss.config.mjs and tailwind.config.js). Confirm Tailwind v4 and `@tailwindcss/postcss` plugin are configured for the linter (biome/ESLint or whatever the toolchain uses).
     - Ensure files using `@apply` are processed by Tailwind before Biome/other linters parse them. If linter complains, consider moving `@apply` into classes under `@layer components` or quoting explicit CSS until pipeline is fixed.
     - Temporary unblock: replace `@apply bg-background text-foreground;` with `background: var(--background); color: var(--foreground);` in `body` to avoid `@apply` until config is fixed.

2. Run local dev + lint once CSS pipeline is fixed
   - Commands: `npm run dev` and `npm run lint`
   - Verify TypeScript errors: `npm run build` or `tsc --noEmit` (project likely has `type-check` script in README, but check package.json which does not include `type-check` — run `npx tsc --noEmit`).

3. Verify anchor scrolling behavior (medium)
   - After CSS is fixed, test `#how-it-works` and `#features` nav links; confirm `scroll-padding-top` is effective for the fixed nav. If browsers differ, implement a small JS offset handler for nav anchor clicks.

4. Implement TODOs by priority (pick from the list above)
   - Email senders for invites (app/api/*) — important for real workflows.
   - Stock endpoints & charts — essential for operational views.
   - Purchase-order small UX fixes (warehouse selection and approvedBy source).

## 7) Future scope & nice-to-have (medium / long-term)

- Move header height into a CSS custom property (e.g., `--site-header-height`) and use it for `scroll-padding-top` and layout paddings — easier single-source-of-truth for spacing and anchor offsets.
- Add robust E2E tests (Cypress / Playwright) for anchor navigation, auth flows, and critical inventory operations.
- Improve server-side rendering (SSR) performance for heavy dashboard queries (add caching or pre-aggregated views in Neon DB).
- Add feature flagging for experimental UIs (e.g., responsive overlay) and gradual rollouts.
- Centralize toast/error handling for API endpoints and form failures.
- Automate migration and seed pipelines in CI (PR check that runs `npm run db:generate` and a smoke test against a test DB).

## 8) How I collected this information

- CSS diagnostics: local tooling returned the compile errors for `app/globals.css` (unknown at-rules and `@apply` usage).
- `package.json` read to find dev/build/lint scripts.
- Codebase scanned for `TODO|FIXME|XXX` markers and sample hits were included above.

## 9) Next recommended immediate steps (actionable)

1. Fix `app/globals.css` processing error (investigate Tailwind/PostCSS/biome pipeline). Prioritize this before running `npm run dev`.
2. Run `npm run lint` and `npm run dev` locally to surface remaining issues.
3. Triage and assign TODOs (email invites, stock API endpoints, purchase-order small fixes). Create GitHub issues or a project board with priorities.

## 10) Helpful commands (run in repo root, PowerShell)

```powershell
# start dev server
npm run dev

# run lint
npm run lint

# build for production (will surface TypeScript errors)
npm run build

# clear local tooling cache if needed
npm run clear-cache
```

## 11) Attachments / Diagnostics (raw snippets)

- CSS diagnostics (from local tool):
  - `Unknown at rule @custom-variant` — around `app/globals.css` line 4
  - `Unknown at rule @theme` — around `app/globals.css` line 6
  - `Unknown at rule @apply` — around `app/globals.css` lines ~121 and ~128

- Example TODOs found (representative):
  - `app/api/invites/route.ts` — `// TODO: Send email notification here`
  - `app/api/company-invites/route.ts` — `// TODO: Send email notifications here`
  - `app/inventory/stock/page.tsx` — multiple TODOs about implementing API calls and charts
  - `app/purchase-orders/create/page.tsx` — `// TODO: Allow warehouse selection`
  - `app/purchase-orders/page.tsx` — `// TODO: Get from auth context`

## 12) Closing / ownership suggestions

If you want, I can:
- produce a prioritized GitHub issue list (auto-create issues with the TODOs above),
- create a small reproducible patch that temporarily replaces `@apply` in `app/globals.css` with explicit CSS to unblock local builds (no functional changes), or
- implement the JS anchor-offset fallback for navigation anchors if CSS-only approach proves inconsistent.

Tell me which of those you want next and I will proceed (I will not change any code unless you ask me to).

---

Generated by repository scan at 2025-11-06.
