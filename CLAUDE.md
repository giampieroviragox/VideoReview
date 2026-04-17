# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server

# Build
npm run build        # Prisma generate + Next.js build
npm start            # Start production server

# Linting
npm run lint         # ESLint

# Database
npx prisma db push   # Apply schema changes (no migrations)
npx prisma db seed   # Run prisma/seed.ts
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma studio    # Visual DB browser
```

There is **no test suite** — the project has zero test files.

## Architecture

**Tellr** is a Next.js 15 App Router SaaS for collecting video testimonials. Users create campaigns, share public recording links, and view AI-enriched submissions in a dashboard.

### Key Layers

**`src/lib/`** — shared server utilities:
- `db.ts` — Prisma singleton with a proxy wrapper so build-time DB unavailability doesn't crash the import
- `s3.ts` — Cloudflare R2 helpers; presigned upload URLs (10 min, 200 MB limit) and presigned view URLs (1 hr). Videos are uploaded **directly from the browser** to R2 — never through the Next.js server.
- `ai/` — Three-step pipeline: (1) FFmpeg extracts audio from stored video, (2) OpenRouter multimodal model transcribes, (3) second OpenRouter call rewrites transcript into a polished review + key phrase. Controlled by `OPENROUTER_AI_ENABLED` env flag.
- `webhooks/` — HMAC-SHA256 signed outbound webhooks with exponential-backoff retry. Events are dispatched via Next.js `after()` so they fire after the HTTP response.
- `dashboard-*.ts` files — server-side data-fetching functions consumed by dashboard Server Components.

**`src/app/`** — Next.js App Router:
- `(dashboard)/dashboard/` — authenticated CMS (campaigns, submissions, Wall of Love, webhooks, settings)
- `(public)/c/[brandSlug]/[campaignId]/` — public campaign recording page (no auth)
- `(public)/wall/[slug]/` — public Wall of Love showcase
- `api/` — API route handlers for submissions, uploads, AI processing, webhooks, campaigns

### Data Model (Prisma)

Eight models in `prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| `Campaign` | Multi-question feedback collection owned by a Clerk user |
| `Submission` | Individual video; holds S3 key, AI fields (`transcript`, `generatedReview`, `keyPhrase`, `aiStatus`), approval status |
| `BrandProfile` | Per-user colors and logo (one per `userId`) |
| `WallOfLove` | Public showcase page; references selected Submissions |
| `WebhookEndpoint` | Registered endpoint URL + secret per campaign |
| `WebhookEvent` / `WebhookDelivery` | Immutable event record + per-endpoint delivery log with retry state |
| `CollectionPage` | Legacy public page; predates the Campaign model |

`aiStatus` transitions: `PENDING → PROCESSING → COMPLETED | FAILED`.

### Authentication

Clerk handles all auth. `src/middleware.ts` protects routes. Dashboard routes require a signed-in Clerk user; the `userId` from Clerk is the tenant identifier used throughout (no separate users table).

### Environment Variables

Required at runtime (see `.env.example` if present):
- `DATABASE_URL` — PostgreSQL connection string
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_PUBLIC_URL`
- `OPENROUTER_API_KEY`, `OPENROUTER_AI_ENABLED` (`true`/`false`)

### FFmpeg

`next.config.ts` bundles an FFmpeg static binary for use inside API routes during AI audio extraction. If you modify the AI pipeline, keep FFmpeg usage inside API routes (not edge runtime).

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
