# Base44 build inventory

Written 27 October 2026 before any Phase 0 code, as the brief requires. Each feature is marked **Works** (real behaviour, keep), **Placeholder** (looks right, fake or unbacked logic, schedule replacement) or **Missing** (the brief requires it and it is not here).

## What the starting build is

A React 18 + Vite 8 + Tailwind + shadcn/ui single-page app exported from the Base44 builder. All persistence, auth, file upload, email and the one AI call go through the Base44 SDK (`src/api/base44Client.js`) to a Base44 backend that is **not linked on this machine** (no `VITE_BASE44_APP_ID`, no `base44/.app.jsonc`). So every data-backed feature below is non-functional today regardless of its code.

The stack already matches the brief's target (React + Vite + Tailwind). No stack migration is needed.

## Routes and screens

| Route | Screen | Mark | Notes |
|---|---|---|---|
| `/` | Home: Navbar, Hero, HowItWorks, ArtisanGrid, WhyUs, ComingSoon, Footer | Works (UI) | Multi-trade artisan marketplace positioning, not a trade-aware front desk. Hero search box routes text to `/aura`. `ComingSoon` section is a banned "coming soon" placeholder. |
| `/artisan/:id` | ArtisanDetail: profile, portfolio, services, ReviewsSection, BookingDialog | Works (UI) / Placeholder (data) | Profile content is static synthetic data from `src/lib/artisanData.js`. Reviews read/write a Base44 entity (unbacked). |
| `/aura` | Aura: chat with orb, voice in/out, photo attach, DiagnosisCard, EmergencyBanner | Placeholder | See "AI" below. |
| `/dispatch` | Dispatch: open jobs list, simulated WhatsApp/SMS offer cards, one-tap accept | Placeholder | Reads/updates Base44 `BookingRequest`. Offer cards show "Sent" but nothing is sent anywhere. |
| `/frontdesk` | Frontdesk: pending/accepted counts, alert email, inbox, schedule | Placeholder | Reads Base44 `BookingRequest` and user; no quotes, no approve/edit/send. |
| `*` | PageNotFound | Works | Calls Base44 auth; harmless. |
| (not routed) | Login, Register, ForgotPassword, ResetPassword, OAuthConsent, AuthLayout, ProtectedRoute, GoogleIcon | Placeholder (dead files) | Base44 auth screens never mounted in `App.jsx`. Remove. |

## Features against the brief's spine

### Capture
- Chat text input and browser voice (Web Speech API via `src/hooks/useVoice.jsx`): **Works** (browser-native, no provider).
- Photo attach in chat (`Composer.jsx`): **Placeholder**. File is pushed to Base44 private storage, then a signed URL is sent to the AI. No guided capture (wide / straight-on / 45° / close-up / reference), no retake prompts, no video upload, no frame snapshot.
- Photo preview shown to customer: **Missing** (only the filename is shown).

### Assess
- AI brain: **Placeholder**. `Aura.jsx` invokes Base44 function `aura`, which calls `base44.integrations.Core.InvokeLLM` with an inline prompt and a JSON schema. That is a direct, unlabelled call to an unnamed provider, not a gateway, and not a Meta model. Prompt lives in code, not `prompts/prompts.md`.
- Segmentation / outline on the photo: **Missing**.
- Measurement (shoelace area, reference scale, tilt, no-reference rule): **Missing**.
- Assessment card (`DiagnosisCard.jsx`): **Placeholder**. Shows trade, severity word, title, description, steps, materials list and labour, and a "Budget / Standard / Premium" slider that multiplies the AI's numbers by fixed factors. No confidence, no measurement basis, no disclaimer, no material alternatives, no failed-part field, no trade field on a case.
- Emergency triage banner: **Works** (UI) with hotline hardcoded to 112. Concept is kept; the decision must come through the gateway.

### Draft quote
- **Placeholder**. Prices are whatever the LLM returns, scaled by the tier slider. No rate card, no USD materials-plus-labour maths with rates shown, no ±20% range rule, no "Draft only" disclaimer, no status (draft → awaiting approval → approved → sent).

### Book
- `BookingDialog.jsx`: **Placeholder**. A four-field form (name, phone, free date, notes) that creates a Base44 `BookingRequest`. No offered slots, no calendar, no double-booking guard, no three-tap booking, no confirmation with date/time/address.
- `frontdeskNotify` function: **Placeholder**. Emails admins through Base44 `SendEmail`; unbacked.
- Dispatch "accept with one tap" writes `status: accepted`: **Placeholder** (unbacked, and not the brief's owner-approval flow).

### Follow up / reactivate
- Dead-lead reactivation, opt-outs, recovered-jobs counter: **Missing**.

### Dashboard
- Counts, inbox and schedule lists: **Placeholder** (unbacked). Three plain numbers (enquiries answered, appointments booked, jobs reactivated): **Missing**. Lead card with Approve / Edit / Send: **Missing**. Calendar list reading the same source as offered slots: **Missing**.

### Report visual
- **Missing**.

### Voice calls (transcription feeding the same case)
- **Missing**. Browser speech-to-text exists in chat only.

## State and data model

- No central case record. State is per-page React state plus Base44 entities:
  - `BookingRequest` (artisan_id, customer_name, phone, preferred_date, notes, status pending|accepted, assigned_*).
  - `ArtisanReview` (artisan_id, customer_name, rating, comment).
  - `User` (role admin|user, alert_email).
- Static synthetic data: `src/lib/artisanData.js` (5 artisan profiles, Lagos coordinates, USD rates, portfolio) and `src/lib/geo.js` (haversine routing, **Works**, pure).
- Images: every photo and the logo are served from `media.base44.com` (Base44's CDN). They are AI-generated generic artisan imagery.

## Design

- Fonts: Fraunces (headings), **Inter Tight** (body), Instrument Serif, JetBrains Mono, DM Serif Display. Inter is banned by the brief; required set is Manrope / DM Sans / IBM Plex Mono.
- Tokens: warm off-white background, terracotta primary (`hsl(13 51% 42%)`), 0.75rem radius, 3xl rounded cards. Brief requires `#f6f5f1 / #ffffff / #101216 / #5a5b61 / #d9d7d0 / #07101c / #f15a24 / #b63a0e`, 14px cards, 12px/40px buttons, hairlines, no shadows.
- Motion: framer-motion with long (0.7–1.2s) eases and a 7.5s hero zoom; brief wants interactions under 300ms, transform/opacity only, reduced motion respected.

## Conflicts with Part A and the honesty rules (flagged, not quietly kept)

1. **Unlabelled provider.** Aura's diagnosis is produced by an unnamed LLM through Base44 `InvokeLLM`, not through a gateway, with no provider label. Must be replaced by the gateway before any demo.
2. **Invented sending.** The Dispatch page says artisans "get it on WhatsApp and SMS" and offer cards show "Sent". Nothing is sent. Removed from the journey until it is real.
3. **Invented pricing.** The tier slider multiplies prices by 0.7 / 1 / 1.6 with no rate card and no disclaimer. Replaced by rate-card maths with the "Draft only" line.
4. **"Coming soon" section** on the home page. Removed.
5. **Generic AI-generated imagery** for the demo tenant, hosted on a third party's CDN. Allowed to remain only as placeholders until product-matched visuals exist; flagged for replacement.
6. **Banned font** (Inter Tight). Replaced with the brief's set.
7. **Pre-event code.** This Base44 export is the starting build, not hackathon work. It is committed as the first commit, labelled as the starting build, so every later commit is identifiable as event work. No pre-event Eye prototype code is in this folder.
8. **Not Meta.** Nothing here uses a Meta model. The gateway swap plan in the brief applies in full.

## Decision: preserve / replace

**Preserve:** app shell, routing, Tailwind + shadcn component library, Home layout (re-pointed at the roofing tenant), chat page structure and orb, browser voice input, emergency banner concept, Front desk and Dispatch page skeletons, haversine routing, synthetic artisan profiles (as the "artisans in general" track for later).

**Replace, in the brief's order:**
1. Base44 `InvokeLLM` call → AI Gateway (`src/gateway/`) with five capabilities, `AI_PROVIDER=initial|meta|mock`, prompts in `prompts/prompts.md`, every call logged and labelled.
2. Booking form → real slot calendar in the case store; dashboard schedule reads the same source.
3. Dispatch "accept" → human approval flow (draft → awaiting approval → approved → sent) on every quote and reactivation message.
4. Base44 entities → one case record in a local seed store (synthetic data only). Base44 SDK removed from the journey; the owner has asked for Base44 to go entirely, which this path delivers.

**Remove:** unrouted auth screens, `ComingSoon`, `ReviewsSection` writes, Base44 functions and entity schemas once nothing reads them.
