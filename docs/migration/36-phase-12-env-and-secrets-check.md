# Phase 12 Environment and Secrets Check

Phase 12 keeps Vercel preview preparation demo-only. The preview must use a demo or staging Supabase project with anon/public frontend credentials only.

## `.env.example`

Current tracked placeholders:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The example intentionally does not require:

- Base44 app IDs or URLs
- Supabase service-role keys
- Database passwords or direct connection strings
- Telegram tokens
- Production secrets
- Real Base44 export paths

## Frontend Secret Boundary

Only `VITE_` variables are exposed to browser code. Therefore the preview must never place server-only credentials into Vercel frontend environment variables.

Allowed for preview:

- `VITE_SUPABASE_URL`: demo/staging Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: anon/public key for that demo/staging project

Blocked for preview:

- Production Supabase project URL or key
- Service-role key
- Database password or connection URI
- Telegram bot token
- Base44 runtime credentials

## Local Files

`.env` and `.env.*` are ignored by Git, while `.env.example` remains tracked. Base44 export payload folders are ignored:

- `exports/base44/manual-drop/`
- `exports/base44/runs/`

No real Base44 export records are tracked in this phase.
