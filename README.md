# Treelogy — Omnichannel Sales Tracking

Dashboard pelacakan penjualan omnichannel Treelogy (Shopee, Tokopedia, Shopify, dan penjualan offline: Walk-in, WhatsApp, Consignment, La Brisa, Wholesale).

## Arsitektur

```
Jubelio (semua channel) ──webhook──► Supabase ──views──► Dashboard (Next.js/Vercel)
CSV historis + Shopify historis ──── (dimuat & ter-dedup) ────────────►┘
```

- **Data**: Supabase Postgres. Data tersatukan & ter-dedup dari 3 sumber (CSV historis, Jubelio realtime, Shopify). Identitas pelanggan lintas-sumber via `unified_customer_id`.
- **Realtime**: Supabase Edge Function `jubelio-webhook` → RPC `ingest_jubelio_salesorder` (idempotent) menyerap order Jubelio begitu masuk.
- **Frontend**: Next.js (App Router) — Server Components membaca views agregasi via service key server-only; chart SVG server-rendered.

## Development

```bash
npm install
# butuh .env.local: SUPABASE_URL, SUPABASE_SERVICE_KEY
npm run dev
```

## Deploy

Terhubung ke Vercel via Git integration — push ke `main` otomatis deploy production.
Live: https://treelogy-tracking.vercel.app

> Catatan: file berisi data pelanggan (CSV/XLSX) dan kredensial (`.env`) sengaja di-`.gitignore` dan tidak pernah di-commit.
