# Agently Front Desk

The AI front desk that turns a photo of a problem into an assessed job, a draft quote and a booked appointment, for roofing companies and med spas first, then handiwork artisans in general. Built for the Meta Global AI Developer Hackathon (submission 4 November 2026).

**Status (28 Oct):** every feature in the brief runs end to end on the **mock provider**, labelled on every screen: roofing and med spa journeys, dead-lead reactivation, phone-call path, voice mode, branded report, drag-to-correct outline, daily summary. The interim provider (Claude, `VITE_AI_PROVIDER=initial`) is written and goes live once `ANTHROPIC_API_KEY` is set in `.env.local`; the Meta provider is the Phase 4 swap. Both are proven by the same contract and golden tests.

## The journey

1. Customer describes the problem in chat (`/chat`); the front desk asks for the address, then a photo.
2. The photo (or a frame picked from a short video) is checked for size, light and blur, shown back to the customer, then outlined (segmentation), measured (`src/lib/eye.js`: shoelace area, scale from a reference object, tilt correction; **no reference means no square-metre figure**), assessed, and priced from the rate card as a USD draft range with the maths and disclaimer shown.
3. The customer books a real inspection slot in three taps.
4. The owner sees the lead on the dashboard (`/frontdesk`), taps Approve, then Send. Status moves one way: draft → awaiting approval → approved → sent. The customer's chat shows the sent range.

**Live demo (mock provider):** https://agently-frontdesk.vercel.app

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. No keys are needed for the mock provider. Set `VITE_AI_PROVIDER` (and the optional router and price variables above) in `.env.local`.

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

Rehearsal photos: `public/demo/roof-test.jpg` (reference object in frame) and `public/demo/roof-noref.jpg` (a file name containing `noref` makes the mock provider report no reference, so the no-reference rule can be rehearsed). Both are synthetic drawings.

## Walkthrough (10 minutes, no keys needed)

1. **Home** (`/`): the demo tenant's page. Type a problem in the field and press Start.
2. **Chat** (`/chat`): answer the address question, then add `public/demo/roof-test.jpg` (or any roof photo). Watch the outline, the assessment card, the measurement basis and the draft range with its maths. Pick a slot, confirm. Try "Talk instead" for the voice mode.
3. **Front desk** (`/frontdesk`): the lead is there with "Awaiting approval". Approve, then Send; the customer's chat now shows the confirmed range. "Show assessment" → "Correct the outline": drag a point and save; the range recomputes. "Prepare damage report" downloads the branded report.
4. **Dead leads** (right column): "Draft re-openers", open a lead, Approve, Send, then play the reply "Yes, book me in". The counter rises by one and the booking is on the calendar. Opted-out leads are excluded and counted.
5. **Phone calls**: "Play a rehearsed call"; the transcript is qualified into a new lead.
6. **Med spa**: switch the tenant in the header, then "Customer view": consent card, service match, clinician flags, consultation booking.
7. `public/demo/roof-noref.jpg` has no scale reference: the card shows percent only, no square metres and no dollar total.

"Reset demo data" on the Front desk clears everything.

## Verification, routing and the eval set (Meta workshop lessons)

Built on 2 Nov 2026 from the Agents 101, Agents 102 and Fireworks sessions. Everything below shows on the job's **Assessment** view on `/frontdesk`.

**Plan, act, verify** (`src/lib/pipeline.js`, shared by the chat and the eval):
1. The router picks a tier and effort, and Muse Spark drafts the assessment card. The price always comes from the rate card, never from the model.
2. A **separate reviewer pass** (`judgeAssessment`, Muse Spark) reads only the evidence and the card. It returns PASS, or FAIL with typed issues: contradiction, unsupported or missing.
3. On FAIL, the issues are fed back and the draft is retried one tier up. After 3 failed reviews the job is **escalated to a person** instead of looping.

**Three layers, visible on screen** (`src/lib/verify.js`):
- **Layer 1, coded checks.** Each one has its exact reason, and they run at four milestones: capture, assessment, quote and booking. The checks:
  - details present
  - usable photo
  - damage outlined, or "segmentation failed, escalate"
  - no area claimed without a reference object
  - quote lines add up and the rates are on the rate card
  - slot real, free and in the future
  - no banned content
- **Checklist vs evidence.** There is one checklist per trade in `src/config/policy.js`. Each item is PROVEN, NOT PROVEN (with the gap named) or ESCALATED, and items are compared with a tunable coverage bar (80% for roofing). Items the quote rests on (damage, material) or the consent rests on are required whatever the bar. The reference is the evidence itself: photo, description, rate card and slot list. There is no hidden answer key.
- **Layer 2:** the reviewer pass above.
- **Layer 3, human sign-off.**
  - Approve works directly only on a verified job. Any other job needs "Review & approve" with a written reason.
  - Reject also needs a reason.
  - Every step, edit and reason goes into the audit trail on the job.
  - The customer's range is held until the job verifies or a person signs it off.

**Router** (`src/lib/router.js`):

| Task | Tier | Effort | Human review |
|---|---|---|---|
| Chat turns, re-openers, voice desk | small | low | no |
| Clear single-problem assessment, reviewer pass | medium | medium | no |
| Safety hazard, photo vs description conflict, several problems | large | high | forced |
| Retry after a failed review | next tier up | higher | after 3 failures |

Model ids come from env (`VITE_META_TIER_SMALL_MODEL`, `_MEDIUM_`, `_LARGE_`). Without them, every tier uses the configured Muse Spark model and only the reasoning effort changes; nothing invents a model name. Every call is logged per job with model, tier, effort, tokens, latency and router reason. Cost appears only when `VITE_META_PRICE_IN_PER_M` and `VITE_META_PRICE_OUT_PER_M` are set. It is never estimated.

**Eval set** (`src/eval/jobs.js`) has 14 synthetic jobs:
- 3 clear roofing jobs.
- 8 edge cases: blurry photo, no reference, missing address, description contradicts photo, price off the rate card, sparks near water, unsure material, two problems in one photo.
- 3 med spa jobs, one with no consent recorded.

To run it:
- `npm run eval` runs the mock and writes [docs/EVAL.md](docs/EVAL.md), currently 14/14.
- `/eval` runs the same jobs live through the gateway, so on Meta it records real tokens and time.

Plumbing, carpentry and bricklaying are not built in this submission.

**Rehearse the failure on purpose:** start a chat with "The gutter is hanging off the front of the house and water pours down the wall", then add `public/demo/roof-test.jpg`. Here is what happens:
1. The reviewer flags the contradiction 3 times.
2. The customer is told a person is checking it.
3. The job shows "Escalated to you" on the dashboard and needs a reason to approve.

## The desk agent: plan, look up, answer

Each customer message runs a short plan-act-observe loop (`src/lib/agent.js`, at most 3 lookups). Muse Spark either calls one tool or answers:

| Tool | Reads |
|---|---|
| `check_calendar` | Real open slots for the next 7 days, optionally on a named day |
| `rate_card` | Published roofing rates per m², labour per hour and service prices printed on the business's website (never a job total), or the med spa menu |
| `business_facts` | Name, service area, first visit, the setup summary and the quotes read from the business's own website at setup. Anything else is "not on my record" |
| `customer_history` | Earlier enquiries from the same address |
| `storm_reports` | Weather-service storm reports on record |

The answer may state only facts a tool returned. A coded grounding check holds back any clock time or dollar figure that no lookup, no earlier message and no approved quote contains. The customer sees small "Checked the calendar" chips under a reply. The owner sees "How the desk answered" on the lead: each plan, each lookup and what it found, and whether the reply passed grounding. A question is never taken as the job description or the address, and the desk carries on qualifying the job after answering. Tests: `tests/agent.test.js` (9) and the "smart desk" e2e journey.

## Layout

- `src/gateway/` — the AI Gateway: `segmentDamage`, `assess`, `converse`, `reactivateMessage`, `renderReportVisual`, `transcribeCall`. Providers: `mock` (deterministic), `initial` (Phase 1), `meta` (Phase 4). Every call is logged with capability, latency and provider.
- `prompts/prompts.md` — every prompt, versioned.
- `src/lib/store.js` — the case record, calendar slots and gateway log (localStorage, synthetic data only).
- `src/lib/seed.js` — demo tenants (fictional, names locked), placeholder rate card, inspection slots.
- `src/lib/eye.js`, `src/lib/quote.js` — measurement and quote maths, pure functions.
- `src/pages/Chat.jsx`, `src/pages/Frontdesk.jsx`, `src/pages/Home.jsx` — the three screens.
- `docs/BASE44_INVENTORY.md` — what the starting build contained and what was replaced.

## Checks

```bash
npm test        # Eye maths, quote rules, verification, router, gateway contract against the mock provider
npm run eval    # the 14-job eval set on the mock; writes docs/EVAL.md
npm run lint
npm run build
```

`tests/golden.test.js` scores the Eye against `tests/golden/manifest.json` (hand-checked outlines, reference objects, materials): outline IoU, area within 20% when a reference is present, material right on most. Two synthetic photos are in it today; the brief's 12 real photos (3 materials × 2 damage types × 2 angles) go in the same manifest. `GOLDEN_PROVIDER=mock` is the default.

`tests/contract.js` is the gateway contract. The same contract runs against the interim and Meta providers when they are configured, so a provider swap is proven by the same tests.

## Phased plan

Phase 0 (today) boss test → Phase 1 interim provider, guided capture retakes, video frame snapshot, contract tests → Phase 2 reactivation, daily summary → Phase 3 med spa tenant, report visual → Phase 4 Meta swap, voice calls → Phase 5 golden tests, demo video, submission.
