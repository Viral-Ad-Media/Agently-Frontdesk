"""Builds the two picture guides (HTML) from the screenshots. Render to PDF with scripts/print-guides.mjs.
   python3 scripts/build-guides.py <shots_dir> <out_dir>
"""
import html, os, sys
from PIL import Image

SHOTS, OUT = sys.argv[1], sys.argv[2]
IMG = os.path.join(OUT, "img")
os.makedirs(IMG, exist_ok=True)
EXTRA = {"27-dash-storm": os.environ.get("STORM_PNG")}


def img(name):
    src = EXTRA.get(name) or os.path.join(SHOTS, name + ".png")
    im = Image.open(src).convert("RGB")
    if im.width > 1700:
        im = im.resize((1700, round(im.height * 1700 / im.width)), Image.LANCZOS)
    dst = os.path.join(IMG, name + ".jpg")
    im.save(dst, "JPEG", quality=84, optimize=True)
    return "img/" + name + ".jpg", im.width / im.height


# Speeds measured on Luqman's PC, Meta provider, 2 Nov 2026 (gateway log). Nothing else is claimed.
SPEED = {
    "agent": "Measured on Meta: about 7 s per step (median 7.2 s, 10 steps, 5.0 to 8.7 s). A reply that looks something up takes two steps.",
    "desk": "Measured on Meta: 4.4 s and 5.6 s per answer (2 runs).",
    "draft": "Measured on Meta: median 7.9 s per draft (13 drafts, 5.1 to 14.4 s).",
    "sam": "Measured on Meta: SAM 3.1 answers in 2.3 to 4.2 s per call. The whole photo step has not been timed yet.",
}


def card(n, name, title, lines, runs=None, speed=None, tall=False):
    src, ratio = img(name)
    li = "".join(f"<li>{l}</li>" for l in lines)
    r = f'<p class="runs"><b>Runs on</b> {runs}</p>' if runs else ""
    s = f'<p class="speed">{speed}</p>' if speed else ""
    cls = "card tall" if (tall or ratio < 0.9) else "card"
    return f'''<section class="{cls}"><figure><img src="{src}" alt="{html.escape(title)}"></figure>
<div class="label"><p class="num">{n}</p><h3>{title}</h3><ul>{li}</ul>{r}{s}</div></section>'''


def page(title, sub, intro, sections, extra_top=""):
    body = []
    n = 0
    for head, cards in sections:
        body.append(f'<h2 class="part">{head}</h2>')
        for c in cards:
            n += 1
            body.append(card(n, *c))
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body>
<header class="cover"><p class="eyebrow">Agently Front Desk</p><h1>{title}</h1><p class="sub">{sub}</p>{intro}</header>
{''.join(body)}
{extra_top}
</body></html>'''


CSS = """
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #0b0b0d; color: #f2f2f4; font: 11pt/1.45 -apple-system, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cover { padding: 6mm 2mm 4mm; border-bottom: 1px solid #26262b; margin-bottom: 4mm; }
.eyebrow { color: #f26a2e; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; font-size: 9pt; margin: 0; }
h1 { font-size: 26pt; margin: 2mm 0 1mm; letter-spacing: -.02em; }
.sub { color: #a1a1aa; margin: 0 0 3mm; font-size: 11.5pt; }
.notes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin: 0; padding: 0; list-style: none; }
.notes li { background: #151518; border: 1px solid #26262b; border-radius: 3mm; padding: 3mm; font-size: 9.5pt; color: #d4d4d8; }
.notes b { color: #fff; }
h2.part { font-size: 15pt; margin: 6mm 0 3mm; padding-top: 2mm; color: #fff; break-after: avoid; }
h2.part::before { content: ""; display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; background: #f26a2e; margin-right: 2.5mm; vertical-align: middle; }
.card { display: grid; grid-template-columns: 64% 1fr; gap: 5mm; align-items: start; background: #121215; border: 1px solid #26262b; border-radius: 3mm; padding: 4mm; margin-bottom: 4mm; break-inside: avoid; }
.card.tall { grid-template-columns: auto 1fr; }
.card figure { margin: 0; }
.card img { display: block; max-width: 100%; max-height: 78mm; border-radius: 2mm; border: 1px solid #2a2a30; }
.card.tall img { max-height: 165mm; max-width: 160mm; }
.num { margin: 0; width: 8mm; height: 8mm; border-radius: 50%; background: #f26a2e; color: #fff; font-weight: 700; display: grid; place-items: center; font-size: 10pt; }
.label h3 { font-size: 13pt; margin: 2.5mm 0 2mm; }
.label ul { margin: 0; padding-left: 4.5mm; color: #d4d4d8; }
.label li { margin-bottom: 1.4mm; }
.label b { color: #fff; }
.runs { margin: 3mm 0 0; padding: 2mm 3mm; background: rgba(242,106,46,.12); border: 1px solid rgba(242,106,46,.35); border-radius: 2mm; font-size: 10pt; }
.runs b { color: #f9a27c; margin-right: 1mm; }
.speed { margin: 2mm 0 0; padding: 2mm 3mm; background: rgba(48,209,88,.10); border: 1px solid rgba(48,209,88,.35); border-radius: 2mm; font-size: 9.5pt; color: #c7f5d2; }
.flow { display: flex; gap: 2mm; align-items: stretch; margin: 4mm 0; }
.flow div { flex: 1; background: #151518; border: 1px solid #26262b; border-radius: 3mm; padding: 3mm; font-size: 9.5pt; color: #d4d4d8; }
.flow div b { display: block; color: #fff; font-size: 10.5pt; margin-bottom: 1mm; }
.flow .arrow { flex: 0 0 auto; background: none; border: 0; padding: 0; display: grid; place-items: center; color: #f26a2e; font-size: 14pt; }
table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 3mm 0 5mm; break-inside: avoid; }
th, td { text-align: left; padding: 2mm 3mm; border-bottom: 1px solid #26262b; vertical-align: top; }
th { color: #a1a1aa; font-weight: 600; }
td b { color: #fff; }
.tagline { color: #a1a1aa; font-size: 10pt; margin: 0 0 3mm; }
"""

NOTES = """<ul class="notes">
<li><b>How to read this.</b> Each picture has a number and a short label: what it is, what to tap, and which Meta model does the work.</li>
<li><b>Demo screens.</b> The pictures were taken in demo mode, so the corner badge says <i>Mock provider</i>. Your live site says <i>Meta models</i> and runs the model named in each label. The storm radar picture was taken on your PC on Meta.</li>
<li><b>Speeds.</b> Green boxes show times measured on your PC on Meta on 2 Nov. Where a step has not been timed yet, no time is given.</li>
</ul>"""

SPARK = "Muse Spark (<i>muse-spark-1.3-contributor</i>)"

FEATURES = [
    ("Landing page ( / )", [
        ("01-landing-hero", "The product page", ["The first page visitors and judges see.", "<b>Try it as a customer</b> opens the customer chat.", "<b>Open the owner dashboard</b> opens the dashboard.", "<b>Set up free</b> opens the new-business setup."], "Nothing. This is a plain page."),
        ("02-landing-demo", "Demo window", ["Plays an example: a customer's message and photo on the left, and what the owner gets on the right.", "It is an animation, not a live chat.", "The roof photo is an illustration made with Muse Image."], "Muse Image made the photo."),
        ("03-landing-how", "How it works", ["Three steps: paste your website, customers reach out, you approve and it sends."]),
        ("04-landing-features", "Features", ["One tile per feature: sees the damage, you approve every price, storm radar, claim pack, wakes up dead leads, answers the phone, never double-books.", "The three photos are illustrations made with Muse Image, with the outline drawn on top."]),
        ("05-landing-trades", "Trades", ["The two desks that work today: <b>roofing</b> (photo, outline and estimate) and <b>med spa</b> (consent first, menu prices only, a clinician approves)."]),
        ("06-landing-faq", "Questions owners ask", ["Tap a question to open the answer."]),
    ]),
    ("Customer website ( /site )", [
        ("07-site-hero", "The business's own website", ["What a homeowner sees for Summit Ridge Roofing.", "Type the problem in the box and press <b>Start</b>, or tap <b>Describe your roof problem</b>. Both open the chat.", "The hero photo is an illustration made with Muse Image."]),
        ("08-site-how", "How it works, for customers", ["The steps from a leak to a booked inspection, in the customer's words."]),
        ("09-site-why", "Why trust it", ["The page's three promises: a quick first answer, the working shown, and a person approves before anything is sent.", "<b>Start now</b> opens the chat."]),
    ]),
    ("Customer chat, roofing ( /chat )", [
        ("10-chat-start", "Start of a chat", ["The desk greets the customer.", "Type at the bottom. The <b>camera</b> icon adds a photo and the <b>mic</b> lets them speak.", "<b>Talk instead</b> turns the chat into a voice call in the browser. No phone number is needed.", "<b>Front desk</b> goes to the owner dashboard."], SPARK + ". Speech to text and the spoken reply use the browser's built-in voice."),
        ("11-chat-lookup", "Questions get looked-up answers", ["The customer asked a price. The desk checked the price list first, then answered.", "The grey chip shows what it checked: the calendar, the price list, business facts, earlier enquiries or storm reports.", "A time or price that no lookup proved is held back and never shown."], SPARK + ", in a plan, look up, answer loop.", SPEED["agent"]),
        ("12-chat-photo-ask", "Photo request", ["Tips for a good photo.", "<b>Open the Live Eye</b> uses the camera, with a level and the phone's tilt sensor.", "<b>Choose a photo or short video</b> picks a file."], "Nothing. The photo checks run in the browser."),
        ("13-chat-photo-check", "Photo check", ["Brightness, sharpness and size are checked in the browser before anything is sent.", "Tap <b>Use this photo</b>, or retake it."]),
        ("14-chat-assessment", "Assessment and draft quote", ["<b>Finding:</b> what failed and how bad it is.", "<b>Measurement:</b> the outline area, scaled by a known-size object in the photo. The maths is done in code.", "<b>Work needed,</b> then a <b>draft quote</b> from the business's own rate card.", "It is marked <b>Draft</b>, and the business confirms the price on site."], "SAM 3.1 draws the outline. " + SPARK + " writes the finding.", SPEED["sam"]),
        ("15-chat-see-it-fixed", "See it fixed", ["<b>See your roof repaired</b> makes an edited copy of the customer's own photo.", "Drag the handle, or use the arrow keys, to compare now and repaired.", "It is always captioned as an illustration."], "Muse Image (<i>muse-image-1.0</i>)."),
        ("16-chat-slots", "Book a visit", ["Real open times from the business calendar.", "Tap a time."], "Nothing. It reads the calendar."),
        ("16b-chat-confirm", "Confirm the booking", ["Name and phone are optional.", "Tap <b>Confirm booking</b> or <b>Change time</b>.", "A taken slot is never offered to anyone else."]),
        ("17-chat-booked", "Booked", ["Shows the booking and the quote status, which is awaiting approval.", "The customer sees a price only after the owner approves and sends it.", "<b>Prepare damage report</b> turns the outlined photo into a report card."], "Muse Image, for the report card."),
    ]),
    ("Customer chat, med spa", [
        ("18-spa-consent", "Consent before any photo", ["The client must agree before sharing a photo, or they can tap <b>Skip the photo</b> and still book."]),
        ("19-spa-result", "Service match", ["Matches the concern to the spa's own menu and shows its published price range.", "Never a diagnosis. A clinician confirms the plan at the consultation.", "Pick a time to book a consultation."], "SAM 3.1 notes the area. " + SPARK + " matches the menu."),
    ]),
    ("Owner dashboard ( /frontdesk )", [
        ("20-dash-top", "Dashboard overview", ["<b>Business name</b> (top left) switches between businesses.", "<b>Add a business</b> opens setup. <b>Customer view</b> opens that business's chat.", "<b>Eval</b> runs the test set. <b>Reset demo</b> clears demo data.", "<b>Ask your desk</b> (bottom right) is your assistant."]),
        ("21-dash-today", "Today in numbers", ["Enquiries answered, visits booked and old jobs reactivated, plus a one-line summary.", "The copy button copies the summary."], "Nothing. It is counted from your records."),
        ("22-dash-leads", "Leads", ["Every enquiry, newest first.", "The pills show severity, the check result and the quote status.", "<b>Approve</b>, then <b>Send</b>. <b>Edit</b> changes the range, <b>Reject</b> needs a reason, and <b>Prepare damage report</b> makes the report.", "<b>Assessment</b> opens the details."]),
        ("23-dash-calendar", "Calendar", ["Every booked visit.", "<b>X</b> cancels a booking and frees the slot."]),
        ("24-dash-lead-open", "Lead details", ["Opened with <b>Assessment</b>.", "Shows the outlined photo, the finding, the checks and how the desk answered."]),
        ("25-dash-verification", "Verification", ["<b>Layer 1:</b> coded checks that the model cannot skip.", "<b>Checklist:</b> each item proven by the photo or the description.", "<b>Layer 2:</b> a second Muse Spark pass reviews the job.", "<b>Layer 3:</b> your sign-off.", "The table at the bottom lists every AI call for this job: model, tier, tokens, cost and time.", "If a check fails, the price is held from the customer and approving needs a reason."], SPARK + " for the reviewer pass. Layer 1 is code."),
        ("26-dash-how-answered", "How the desk answered", ["For each chat turn: what the customer asked, what the desk looked up and found, and how it answered.", "The green line confirms that every time and price came from a lookup."]),
        ("27-dash-storm", "Storm radar", ["Live National Weather Service warnings for your area. <b>Check now</b> refreshes them.", "A labelled practice storm is there for demos.", "The map shows customers in the path. Anyone who opted out is never contacted.", "<b>Draft storm check-ins</b> writes one note per customer. Approve, edit or send each one, or <b>Approve all</b>."], "Weather alerts come from the National Weather Service, not AI. " + SPARK + " writes the notes.", SPEED["draft"]),
        ("28-dash-calls", "Phone calls", ["On Meta, record the caller with the mic. The call is turned into text and qualified like a chat, and it lands in Leads.", "In demo mode, <b>Play a rehearsed call</b> plays a sample instead."], "Muse Voice Transcribe (<i>muse-voice-transcribe-1.0</i>), then " + SPARK + "."),
        ("29-dash-call-result", "Call result", ["Shows the caller's words, the desk's reply, and the new case in Leads.", "The link sends the customer to the chat to add a photo."]),
        ("30-dash-reactivation", "Dead leads", ["Old enquiries that went quiet. The tabs filter them.", "<b>Draft re-openers</b> writes a personal note for each one."]),
        ("31-dash-reactivation-drafts", "Re-opener drafts", ["Each note is written from that lead's real history.", "Opted-out leads are skipped and counted.", "Approve, edit or send each one. Nothing goes out until you approve it."], SPARK + ".", SPEED["draft"]),
        ("32-desk-open", "Ask your desk", ["Type, or tap the mic and speak.", "<b>Brief me</b> gives today's summary. The suggestions are ready-made actions."], SPARK + ". The mic uses Muse Voice Transcribe.", SPEED["desk"]),
        ("33-desk-answer", "Desk answers and actions", ["Ask it to send a quote. It repeats exactly what it will do and waits.", "Nothing moves until you say yes or tap <b>Confirm</b>."], SPARK + ".", SPEED["desk"]),
    ]),
    ("Other pages", [
        ("34-claim-pack", "Claim pack ( /claim/... )", ["Opens from the <b>Claim pack</b> link on a lead that has a storm on record.", "Shows the weather on record, the damage evidence, the estimate and a timeline.", "<b>Print or save as PDF</b> for the insurance adjuster."], "Nothing. It is built from your records."),
        ("35-eval-start", "Eval set ( /eval )", ["14 synthetic test jobs, each with the right answer.", "<b>Run the eval</b> sends every job through the same assessment and checks as a real job. The photo outline is fixed, so every provider is judged on the same evidence."]),
        ("36-eval-results", "Eval results", ["Shows, for each job: expected against actual result, the tier used, reviews, checklist score, tokens, time and why.", "On Meta it records real tokens, cost and time."], "The same models as a real job."),
        ("37-dash-spa", "Med spa dashboard", ["Pick the spa in the business switcher.", "It has the same layout, with consultations instead of inspections and no storm radar."]),
    ]),
]

SETUP_FLOW = """<div class="flow">
<div><b>1. Paste the website</b>On /setup.</div><p class="arrow">→</p>
<div><b>2. Read the site</b>The server reads the home page, plus up to 2 pages about services or prices. No AI.</div><p class="arrow">→</p>
<div><b>3. Build the desk</b>Muse Spark writes the name, trade, area, services and prices, greeting and page text, and quotes where each fact came from.</div><p class="arrow">→</p>
<div><b>4. Code check</b>A price is kept only if that exact figure is printed on the site.</div><p class="arrow">→</p>
<div><b>5. You review</b>Edit any fact. Nothing goes live until you tap Launch.</div><p class="arrow">→</p>
<div><b>6. Live</b>Every reply looks the facts up at the moment it answers.</div>
</div>"""

LEARN_TABLE = """<h2 class="part">How the desk uses what it learned</h2>
<p class="tagline">The model is not retrained. Setup saves the facts with the business, and on every customer message the desk looks up what it needs before it answers.</p>
<table>
<tr><th>When the customer asks about</th><th>The desk checks</th><th>What it reads, from setup</th></tr>
<tr><td>The business, the area it covers, insurance or warranty</td><td><b>Business facts</b></td><td>Name, trade, service area, summary, and the website quotes from the review screen. Anything not listed is answered with "not on my record" and passed to the team.</td></tr>
<tr><td>Prices</td><td><b>Price list</b></td><td>Service prices printed on the website, such as "Leak detection $199". Roofing also uses the rate card (the demo rate card until you add your own). For a med spa, the menu prices.</td></tr>
<tr><td>Times and availability</td><td><b>Calendar</b></td><td>The new business's open slots, made at launch: the next 5 weekdays at 9:00 AM, 11:30 AM and 2:00 PM.</td></tr>
<tr><td>An earlier enquiry or a storm</td><td><b>Earlier enquiries / storm reports</b></td><td>This business's own leads and storm runs.</td></tr>
<tr><td>Nothing yet: the first message</td><td></td><td>The greeting and website text written at setup.</td></tr>
</table>
<p class="tagline">Model used for setup and for every reply: Muse Spark (<i>muse-spark-1.3-contributor</i>). The pictures use a made-up example website, Bluebonnet Roofing Co.</p>"""

SETUP = [
    ("Set up a new business ( /setup )", [
        ("40-setup-start", "Open setup", ["Open it from <b>Add a business</b> on the dashboard, or <b>Set up free</b> on the landing page.", "Paste the business website and tap <b>Build my front desk</b>.", "Roofing companies and med spas are supported today."]),
        ("41-setup-reading", "Reading and building", ["Step 1 reads the website. Step 2 builds the desk from what the site says.", "The timer shows the seconds taken."], "Step 1 is the server, not AI. Step 2 is " + SPARK + "."),
        ("42-setup-review", "Review screen", ["On the left, the facts it found, which you can edit.", "On the right, what customers will see."]),
        ("43-setup-facts", "Check every fact", ["<b>Business name</b> and <b>Service area</b> can be edited.", "<b>Services found on the site:</b> prices can be edited. A service with no price on the site says so.", "<b>Where each fact came from:</b> the exact words from the website.", "<b>Needs you after launch:</b> anything the site did not say.", "Tap <b>Launch this desk</b>, or <b>Discard</b>."]),
        ("44-setup-preview", "What customers will see", ["The headline, the text, the chat box hint and the first message, all written from the website."], SPARK + "."),
        ("45-setup-launched", "Launched", ["The dashboard switches to the new business.", "Leads start empty. The calendar gets open slots straight away."]),
        ("46-setup-customer-view", "Customer view", ["Tap <b>Customer view</b> on the dashboard. This is the new business's chat, with its own greeting."]),
        ("47-setup-first-answer", "Answers from its own facts", ["Asked about the area, the desk checked the business facts and answered from the service area found at setup.", "Anything not on record goes to the team."], SPARK + ".", SPEED["agent"]),
        ("48-setup-price-answer", "Answers from its own prices", ["Asked a price, the desk checked the price list and quoted the figure printed on the website: Leak detection $199.", "It always adds that the final price is confirmed at the visit."], SPARK + ".", SPEED["agent"]),
        ("49-setup-lead", "It lands in Leads", ["The conversation shows up on the new business's dashboard straight away."]),
    ]),
]

open(os.path.join(OUT, "agently-feature-guide.html"), "w").write(
    page("Every feature, in pictures", "What each screen does, what to tap, and which Meta model runs it.", NOTES, FEATURES))
open(os.path.join(OUT, "agently-new-business-guide.html"), "w").write(
    page("Set up a new business", "From a website address to a live front desk, and how the desk learns the business.", SETUP_FLOW, SETUP, extra_top=LEARN_TABLE))
print("ok")
