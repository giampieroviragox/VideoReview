# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # prisma generate + next build
npm run lint         # ESLint
npx prisma db push   # Push schema changes to DB (no migration files)
npx prisma db seed   # Seed initial data
npx prisma studio    # DB GUI
npx tsx src/...      # Run TypeScript scripts directly
```

No test suite is configured.

## Architecture

This is **Tellr.me** — a SaaS for collecting branded video testimonials. Built with Next.js 15 App Router, Prisma 7 + PostgreSQL (via Supabase), Cloudflare R2 for video storage, Clerk for auth, and OpenRouter for AI enrichment.

### Route structure

| Path | Purpose |
|---|---|
| `/` | Marketing landing page |
| `/c/[brandSlug]/[campaignId]` | Public video submission form (customer-facing) |
| `/review/[slug]` | Legacy collection page (CollectionPage model) |
| `/wall/[slug]` | Public Wall of Love display |
| `/dashboard/*` | Protected brand owner workspace |
| `/api/*` | REST API routes |

### Key data models (prisma/schema.prisma)

- **Campaign** — owned by a Clerk `userId`; has questions, a reward, and an optional `WebhookEndpoint`
- **Submission** — links to a Campaign (or legacy CollectionPage); stores `videoKey` (R2 object key), AI enrichment fields (`aiStatus`, `aiTranscript`, `aiGeneratedReview`, `aiKeyPhrase`), and `status` (pending/approved/rejected)
- **BrandProfile** — per-user branding (colors, logo URL)
- **WallOfLove** — per-user curated showcase page, published at `/wall/[slug]`
- **WebhookEndpoint / WebhookEvent / WebhookDelivery** — full at-least-once webhook delivery system with retries (4 attempts: 1m, 5m, 30m, 2h)

### Video upload flow

1. Client requests a presigned PUT URL from `/api/campaigns/[campaignId]/upload` (or `/api/upload` for legacy)
2. Browser uploads directly to Cloudflare R2 using the presigned URL (max 200 MB, 10-min expiry)
3. API creates a `Submission` record with the R2 `videoKey`
4. AI enrichment is triggered asynchronously via `/api/internal/ai/submissions/process`

### AI enrichment

Triggered on submission creation. Pipeline: R2 presigned URL → ffmpeg-static extracts audio → OpenRouter transcription → OpenRouter rewrite model produces transcript, generated review, and key phrase. Controlled by `OPENROUTER_AI_ENABLED` env flag. The `ffmpeg-static` binary must be traced by Next.js output file tracing — see `next.config.ts`.

### Webhook system

`src/lib/webhooks/` implements the full pipeline:
- `emit.ts` — creates `WebhookEvent` + `WebhookDelivery` rows
- `dispatch.ts` — worker that claims deliveries with optimistic locking, sends signed HTTP POST, handles retries
- Payloads are signed with HMAC-SHA256; headers use `X-Tellr-*` prefix
- Dispatch is triggered via `/api/internal/webhooks/dispatch` (internal endpoint) or `/api/webhooks/dispatch`

### Dashboard data pattern

Server components fetch data in `src/lib/dashboard-*.ts` helpers using `auth()` from Clerk to get `userId`. All dashboard queries scope by `ownerUserId`. The layout (`src/app/dashboard/layout.tsx`) handles auth redirect and passes viewer identity to `DashboardPersistentSidebar`.

### Database client

`src/lib/db.ts` exports a singleton `prisma` using a Proxy pattern to defer instantiation. Uses `@prisma/adapter-pg` with a `pg.Pool` for connection pooling — required for serverless environments.

## Environment variables

See `.env.example`. Key vars:
- `DATABASE_URL` — Postgres (Supabase)
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `OPENROUTER_API_KEY`, `OPENROUTER_AI_ENABLED` (`"true"` to enable), `OPENROUTER_MODEL`
- `NEXT_PUBLIC_APP_URL`
