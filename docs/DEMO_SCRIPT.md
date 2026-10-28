# Demo video script (3 minutes)

Recorded from the live product, from flows the Playwright journeys exercise. Only work built during the hackathon appears. The provider label on screen must read the real provider at recording time (Meta models after the swap); nothing mock or interim is presented as a Meta output.

Timing is for a 3:00 cut. Record at 1440×900 for the desktop shots and 390×844 for the phone shots. No music under the voice; one plain title card at the start and end.

## 0:00–0:20 · The leak

**Screen:** home page on a phone, then the chat.
**Voice:** "Small trade businesses lose the work they already paid to win, in the first five minutes. A homeowner's roof is leaking after a storm. The roofer is on a roof. This is Agently Front Desk: the AI front desk that answers now, assesses the damage from a photo, drafts a price range, books the visit, and never sends a price without a human."

## 0:20–1:05 · Photo to assessment

**Screen:** type "Water dripping through the bedroom ceiling since the storm", give the address, add the rehearsed roof photo, tap "Use this photo". Hold on "Outlining the damage…", then the card.
**Voice:** "The desk asks one question at a time and extracts the address. The photo is checked for light and blur, then SAM 3.1 outlines the damage. The Eye measures it: shoelace area, scaled by a shingle tab in frame, tilt-corrected. No reference, no square-metre claim. Muse Spark names what failed, how bad it is, and the work needed, with its confidence shown. The draft range comes from the roofer's own rate card, materials and labour, with the maths on the card and the disclaimer: draft only, confirmed on site."

## 1:05–1:25 · Three taps to book

**Screen:** pick a slot, confirm, the booking card with date, time and address.
**Voice:** "Booking is three taps on a real calendar. No account, no form. The quote is now waiting for the roofer."

## 1:25–1:55 · The owner's one screen

**Screen:** the Front desk. The lead card, "Awaiting approval". Tap Approve, tap Send. Switch to the customer chat: "Sent · confirmed range". Then "Correct the outline": drag a point, save, the range recomputes.
**Voice:** "Everything lands on one screen. The owner approves, edits or sends with one tap; nothing goes to the customer without it. If the outline is weak, the owner drags it right and the measurement and price recompute from the maths."

## 1:55–2:25 · Dead leads back to revenue

**Screen:** "Draft re-openers (22)", the run summary with "Excluded 3 opted-out leads", open Michael Davis, Approve, Send, "Reply: Yes, book me in", counter 0 → 1, the calendar entry.
**Voice:** "Months ago, twenty-five people asked for a quote and went quiet. One tap drafts a personal re-opener for each from their real history. Opted-out people are never contacted, and they're counted. The owner approves each message. A reply that books lands on the calendar and the recovered-jobs counter goes up by exactly one."

## 2:25–2:45 · Same spine, second trade

**Screen:** tenant switch to the med spa; the client journey with the consent card, the service match, "not a diagnosis", the clinician's approval.
**Voice:** "The spine never changes. For a med spa: consent before any photo, the concern matched to the spa's own services, flags for the clinician, a published price range, and a clinician approving every plan. Never a diagnosis."

## 2:45–3:00 · Close

**Screen:** phone call playing into the dashboard, then the daily summary, then the title card with the repo URL.
**Voice:** "Callers reach the same desk and land in the same case. At the end of the day, three honest numbers. Built on Meta models through one gateway, with a human in every loop. Agently Front Desk."

## Checklist before recording

- [ ] `VITE_AI_PROVIDER=meta`, contract and golden tests green on it, provider badge reads "Meta models".
- [ ] Demo data reset; tenant names and rate card confirmed by the owner.
- [ ] The 12 rehearsed photos in `tests/golden/manifest.json`; the one used on camera scored within 20 percent.
- [ ] Synthetic names and numbers only on screen.
- [ ] Repo public, clean clone builds, `.env.example` has key names only.
