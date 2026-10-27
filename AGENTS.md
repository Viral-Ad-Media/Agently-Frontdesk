# AGENTS.md

## Project context

Agently Front Desk: an AI front desk for roofing companies and med spas first, then handiwork artisans in general. Built for the Meta Global AI Developer Hackathon by a solo owner. The build brief (`docs/`) is binding; its Part A (competition rules) overrides everything else.

Start with `README.md` for setup and the phased plan. `docs/BASE44_INVENTORY.md` records what the starting build contained and what was replaced.

## Hard rules

- Every AI call goes through `src/gateway/`. The UI never calls a provider directly. The active provider is labelled honestly on screen (`ProviderBadge`).
- All prompts live in `prompts/prompts.md`.
- Measurement maths lives in `src/lib/eye.js` and quote maths in `src/lib/quote.js`; no provider replaces the arithmetic. No scale reference means no square-metre figure and no dollar total.
- Quotes are USD draft ranges with the disclaimer. Status moves one way (draft → awaiting approval → approved → sent) and only on a human tap.
- One case record (`src/lib/store.js`) is the single source of truth for chat, dashboard and calendar.
- Synthetic data only. No secrets in the repo; `.env.example` holds key names only.
- Never present mock or interim-provider output as Meta output.

## Key files

- `src/pages/Chat.jsx`: the customer journey (describe → photo → outlined assessment → draft quote → booking).
- `src/pages/Frontdesk.jsx`: the owner dashboard (numbers, lead cards with Approve / Edit / Send, calendar).
- `src/gateway/index.js` and `src/gateway/providers/*`: the five capabilities plus call transcription.
- `src/lib/seed.js`: demo tenant, placeholder rate card and inspection slots.

## Working notes

- `npm run dev` serves the app at http://localhost:5173. On this Windows machine use `npm.cmd` from PowerShell.
- Run `npm run lint` and `npm run build` before finishing code changes.
- Commit small, verified steps with clear messages. The first commit is the pre-event starting build; everything after it is hackathon work.
