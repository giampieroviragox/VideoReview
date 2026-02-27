# Video Reviews MVP 🎬

SaaS per la raccolta di video recensioni dai clienti.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL (Prisma ORM v7)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Recorder**: MediaRecorder API (Native Browser)

## Setup Rapido

### 1. Variabili d'Ambiente
Copia `.env.example` in `.env` e configura i seguenti valori:
- `DATABASE_URL`: Connection string di Supabase o altro Postgres.
- `R2_ACCOUNT_ID`: Account ID di Cloudflare.
- `R2_ACCESS_KEY_ID`: Chiave API R2.
- `R2_SECRET_ACCESS_KEY`: Secret API R2.
- `R2_BUCKET_NAME`: Nome del bucket creato su R2.

### 2. Database
```bash
npx prisma db push
npx prisma db seed
```

### 3. Sviluppo
```bash
npm run dev
```

## Struttura Progetto
- `/src/app/r/[slug]`: Pagina pubblica di raccolta (SSR).
- `/src/components/VideoRecorder.tsx`: Componente di registrazione video.
- `/src/components/SubmissionForm.tsx`: Logica di upload e form multi-step.
- `/src/lib/s3.ts`: Gestion presigned URLs per upload diretto a R2.
- `/prisma/schema.prisma`: Modelli `CollectionPage` e `Submission`.

## Limiti MVP
- Durata Max Video: 90 secondi.
- Dimensione Max Video: ~200MB.
- Formati: `.webm` (default) / `.mp4`.
