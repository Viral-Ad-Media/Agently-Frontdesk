# Agently Frontdesk

AI repair triage, itemised estimates and vetted local artisans, dispatched by real distance.

- **Home** (`/`): hero, artisan directory, how it works.
- **Aura** (`/aura`): voice/photo AI assistant that diagnoses a repair, prices it and flags emergencies.
- **Artisan profile** (`/artisan/:id`): reviews and booking requests.
- **Dispatch** (`/dispatch`): artisans accept pending jobs.
- **Front desk** (`/frontdesk`): operator view of pending and accepted bookings.

Stack: React 18, Vite, Tailwind, shadcn/ui, TanStack Query. Backend (auth, data entities, file uploads, serverless functions) runs on Base44 via `@base44/sdk`.

## Project layout

- `src/` — frontend source (`pages/`, `components/`, `lib/`).
- `src/api/base44Client.js` — backend SDK client.
- `base44/entities/` — data models (`BookingRequest`, `ArtisanReview`, `User`).
- `base44/functions/` — serverless functions (`aura` AI chat, `frontdeskNotify` booking alerts).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without backend configuration the public pages (home, artisan profiles) render with sample data; Aura, bookings, reviews and the dispatch/front desk boards need the backend.

### With the backend

Install the Base44 CLI (`npm install -g base44@latest`) and [Deno](https://docs.deno.com/runtime/getting_started/installation/), then:

```bash
base44 login   # one-time per machine
base44 link    # one-time per clone, writes base44/.app.jsonc
base44 dev     # local backend + frontend together
```

`base44 dev` starts the frontend itself, so don't also run `npm run dev`. Entity data is in-memory and resets on restart. Use `base44 dev --remote` to work against the live hosted backend (writes go to production data).

## Environment

Local values go in `.env.local` (gitignored):

```
VITE_BASE44_APP_ID=
VITE_BASE44_APP_BASE_URL=
```

## Checks

```bash
npm run lint
npm run build
```
