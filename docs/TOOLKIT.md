# Toolkit review

The brief (Part C) lists skills and repos to check before building. Each one below was opened on 27 October 2026, its README and licence read, its current commit pinned, and a decision recorded. Nothing was installed into this project. No code was copied from any of them.

| Item | Repo · pinned commit | Licence | Decision |
|---|---|---|---|
| Taste skill (`design-taste-frontend`) | leonxlnx/taste-skill · `12af471` | MIT | **Applied, and its inspector run** (27 Oct, 22:30) on `/`, `/chat` and `/frontdesk` at 1440 / 768 / 390. Results after fixes: dashboard 0 FAIL; chat 1 FAIL (`blank-gap`: the empty conversation area of a chat screen, by design); home 2 FAIL (`gradient`: the neutral scrim over the hero photo, which the skill itself allows for legibility; `few-pictures`: one photo on the page, because the brief forbids stock imagery and the tenant's real photos have not arrived). Remaining WARNs are the brief's own tokens (cream ground, three typefaces, mono labels) and are kept on purpose. |
| Impeccable | pbakaus/impeccable · `d34c87e` | Apache 2.0 | **Detector run** (27 Oct, 22:20): `npx impeccable detect --json src/` reports **0 findings** across its 62 rules. Its anti-patterns (no Inter, no gray-on-colour text, no pure black, no cards in cards, no bounce easing, no purple gradients) were applied first. |
| Emil Kowalski skills (`emil-design-eng`) | emilkowalski/skill · `2d22863` | MIT | **Applied.** Transform/opacity only, ease-out for enters, UI motion under 300 ms, `scale(0.98)` on press, named transition properties (no `transition: all`), reduced motion respected, no scale(0) entrances. |
| REA (Reverse Engineer Anything) | morluto/rea · `65f1c44` | MIT | **Dropped for now.** It is an MCP server for reverse-engineering binaries and running apps. Nothing in the launch scope needs another app studied; if we study a competitor's booking flow later, use it one feature at a time with seen / inferred / unknown labels and write our own implementation. |
| Karpathy guidelines | multica-ai/andrej-karpathy-skills · `2c60614` | MIT (README; no LICENSE file in repo) | **Adopted as working method**, recorded in `AGENTS.md`: state assumptions, simplest approach, surgical changes, verifiable success criteria (`npm test`, the boss-test script). |
| ThreeUI Community | MengTo/threeui · `68802d5` | MIT | **Dropped.** 3D hero sections need three.js (about 600 kB) and would sit on the customer's phone-first first screen. The brief allows it only if it earns its place; it does not. |
| SOUP | MakazhanAlpamys/Soup · `962a81f` | Apache 2.0 | **Dropped for the hackathon.** Fine-tuning from YAML is later experimentation; the submission runs on the Meta Model API. |
| Playwright | microsoft/playwright · `a169686` | Apache 2.0 | **Adopted and installed** (`@playwright/test` + Chromium, 27 Oct). `tests/e2e/journey.spec.js` scripts the boss-test, owner approve/send, no-reference, reactivation and med spa journeys; `npm run test:e2e` runs them against the dev server. Run at every phase gate. |
| Logo / brand skill | (none chosen) | – | **Deferred.** The current mark is a simple house-outline monogram in the accent, drawn in `Logo.jsx` and `public/favicon.svg`. It survives favicon size and invents nothing. A proper mark is a Phase 5 polish item once the tenant names are confirmed. |

## Where the toolkit and the brief disagree

The brief says its design tokens win any conflict. These Taste house rules were therefore not applied:

- *No monospace outside code* and *no tiny uppercase labels*: the brief mandates IBM Plex Mono for small labels. Kept, but reduced: labels stay only where they name a field or a status; headings, speaker names and section titles are now sentence case in the text face.
- *No thin rules / 1px boxes*: the brief mandates 1px hairline cards and no shadows. Kept.
- *Buttons square or pill*: the brief mandates 12px radius, 40px tall. Kept.

## What the pass changed (27 Oct)

- Home: the four identical icon cards became a split (claim left, four steps as a list right); the glass search field and the blurred nav became flat surfaces; eyebrow labels removed; footer links in sentence case; copy follows the active tenant.
- Dashboard: KPI tiles became type on a rule (no icons in tinted shapes); page title at 24px with the tenant under it; section headings in sentence case; the assessment inside a lead card renders flat (no card in a card).
- Assessment card: the quote block is a tone step, not a bordered box inside a bordered card.
- Chat: the speaker name is quiet sentence case rather than an orange mono eyebrow on every message.

## Second pass from the inspector (27 Oct, evening)

- Primary buttons use orange-deep with white text (5.3:1) instead of orange (3.1:1); orange stays on the mark and accents.
- Home: the tenant line above the headline is gone (folded into the supporting sentence); "An honest first look." fits two lines everywhere; running text set in the full ink; list dividers replaced by space.
- Dashboard: KPI rules are hairlines, not ink.
- Chat: the tenant name in the header is the screen's h1.

## Before submission

1. Re-run all three checks on the production build (`vite build && vite preview`), as the Taste skill asks.
2. Taste's fourteen-pass critique on the final screenshots, written down.
3. Playwright journeys green on the Meta provider.
