# Agently Front Desk

The AI front desk that turns a photo of a problem into an assessed job, a draft quote and a booked appointment, for roofing companies and med spas first, then handiwork artisans in general. Built for the Meta Global AI Developer Hackathon (submission 4 November 2026).

**Status (27 Oct, Phase 1 in progress):** the core roofing journey runs end to end on the **mock provider**, labelled on every screen. The interim provider (Claude, `VITE_AI_PROVIDER=initial`) is written and goes live as soon as `ANTHROPIC_API_KEY` is set in `.env.local`; it is untested until then. Meta models arrive in Phase 4.

## The journey

1. Customer describes the problem in chat (`/chat`); the front desk asks for the address, then a photo.
2. The photo (or a frame picked from a short video) is checked for size, light and blur, shown back to the customer, then outlined (segmentation), measured (`src/lib/eye.js`: shoelace area, scale from a reference object, tilt correction; **no reference means no square-metre figure**), assessed, and priced from the rate card as a USD draft range with the maths and disclaimer shown.
3. The customer books a real inspection slot in three taps.
4. The owner sees the lead on the dashboard (`/frontdesk`), taps Approve, then Send. Status moves one way: draft → awaiting approval → approved → sent. The customer's chat shows the sent range.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. No keys are needed for the mock provider. Copy `.env.example` to `.env.local` to change `VITE_AI_PROVIDER`.

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

Rehearsal photos: `public/demo/roof-test.jpg` (reference object in frame) and `public/demo/roof-noref.jpg` (a file name containing `noref` makes the mock provider report no reference, so the no-reference rule can be rehearsed). Both are synthetic drawings.

## Layout

- `src/gateway/` — the AI Gateway: `segmentDamage`, `assess`, `converse`, `reactivateMessage`, `renderReportVisual`, `transcribeCall`. Providers: `mock` (deterministic), `initial` (Phase 1), `meta` (Phase 4). Every call is logged with capability, latency and provider.
- `prompts/prompts.md` — every prompt, versioned.
- `src/lib/store.js` — the case record, calendar slots and gateway log (localStorage, synthetic data only).
- `src/lib/seed.js` — demo tenant (placeholder name), placeholder rate card, inspection slots.
- `src/lib/eye.js`, `src/lib/quote.js` — measurement and quote maths, pure functions.
- `src/pages/Chat.jsx`, `src/pages/Frontdesk.jsx`, `src/pages/Home.jsx` — the three screens.
- `docs/BASE44_INVENTORY.md` — what the starting build contained and what was replaced.

## Checks

```bash
npm test        # Eye maths, quote rules, gateway contract against the mock provider
npm run lint
npm run build
```

`tests/contract.js` is the gateway contract. The same contract runs against the interim and Meta providers when they are configured, so a provider swap is proven by the same tests.

## Phased plan

Phase 0 (today) boss test → Phase 1 interim provider, guided capture retakes, video frame snapshot, contract tests → Phase 2 reactivation, daily summary → Phase 3 med spa tenant, report visual → Phase 4 Meta swap, voice calls → Phase 5 golden tests, demo video, submission.
