// Takes every screenshot used in the two user guides (docs/guides). Plain Playwright, no test runner.
//   node scripts/guide-shots.mjs [baseUrl] [outDir]
// Works on any provider; real providers just take longer. The setup guide reads a synthetic example
// website (intercepted /api/site), so no real business appears in the guide.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:5173";
const OUT = path.resolve(process.argv[3] || "docs/guide-shots");
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const AI = 150000;
const photo = path.resolve("public/demo/roof-test.jpg");
fs.mkdirSync(OUT, { recursive: true });

const launch = { args: ["--no-sandbox"] };
if (fs.existsSync("/opt/pw-browsers/chromium")) launch.executablePath = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(launch);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: "reduce", colorScheme: "dark" });
const page = await ctx.newPage();
page.setDefaultTimeout(AI);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const settle = (ms = 700) => page.waitForTimeout(ms);
const done = [];

async function shot(name, target, { pad = 0, maxH = 0 } = {}) {
  if (ONLY && !ONLY.has(name.split("-")[0])) return;
  const file = path.join(OUT, `${name}.png`);
  if (!target) {
    await settle();
    await page.screenshot({ path: file });
  } else {
    const loc = target.first();
    await loc.scrollIntoViewIfNeeded();
    await settle();
    if (pad || maxH) {
      if (maxH) await loc.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await settle(300);
      const b = await loc.boundingBox();
      const h = maxH ? Math.min(maxH, b.height) : b.height;
      await page.screenshot({ path: file, clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(1440, b.width + pad * 2), height: h + pad * 2 } });
    } else await loc.screenshot({ path: file });
  }
  done.push(name);
  log("shot", name);
}
// Sends a message and waits for the desk's next reply (the greeting already counts as one message).
const say = async (t) => {
  const before = await page.getByTestId("assistant-message").count();
  await page.getByLabel("Message").fill(t);
  await page.getByLabel("Message").press("Enter");
  await page.getByTestId("assistant-message").nth(before).waitFor();
  await page.getByLabel("Message").and(page.locator(":enabled")).waitFor().catch(() => {});
  await settle(600);
};
const scrollTo = async (loc) => {
  await loc.first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -80);
  await settle(900);
};

// ---------- Fresh demo data ----------
await page.goto(`${BASE}/frontdesk`);
await page.evaluate(() => localStorage.clear());

// ---------- 1. Landing page ----------
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await settle(5000); // the hero demo plays its messages
await shot("01-landing-hero");
await shot("02-landing-demo", page.locator("text=summitridgeroofing.com · front desk").locator("xpath=ancestor::div[contains(@class,'rounded')][1]"));
for (const [n, id] of [["03-landing-how", "#how"], ["04-landing-features", "#features"], ["05-landing-trades", "#trades"], ["06-landing-faq", "#faq"]]) {
  await scrollTo(page.locator(id));
  await shot(n, page.locator(id));
}

// ---------- 2. Customer website ----------
await page.goto(`${BASE}/site`, { waitUntil: "networkidle" });
await shot("07-site-hero");
await scrollTo(page.locator("#how"));
await shot("08-site-how", page.locator("#how"));
await scrollTo(page.locator("#why"));
await shot("09-site-why", page.locator("#why"));
await page.goto(`${BASE}/site?tenant=luma-skin`, { waitUntil: "networkidle" });
await settle(600);
await shot("09b-site-spa");
await page.goto(`${BASE}/site?tenant=summit-ridge`, { waitUntil: "networkidle" });

// ---------- 3. Customer chat, roofing ----------
await page.goto(`${BASE}/chat?tenant=summit-ridge`, { waitUntil: "networkidle" });
await shot("10-chat-start");
await say("How much do you charge?");
await page.getByText(/Checked the/).first().waitFor();
await shot("11-chat-lookup");
await say("Water is dripping through the bedroom ceiling since the storm last night");
await say("14 Larkspur Lane, Lyons");
await page.getByText(/Add a photo of the damage/i).first().waitFor();
await shot("12-chat-photo-ask");
await page.locator("input[type=file]").first().setInputFiles(photo);
await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).waitFor();
await shot("13-chat-photo-check", page.getByRole("region", { name: "Check your photo" }), { pad: 8 });
await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
await page.getByText(/Draft quote|double-checking/i).first().waitFor();
await settle(1200);
await shot("14-chat-assessment", page.getByRole("region", { name: "Assessment" }).last(), { pad: 12 });
const fix = page.getByRole("button", { name: /See your roof repaired/ });
if (await fix.count()) {
  await fix.click();
  await page.getByRole("img", { name: /after the repair/ }).waitFor();
  await shot("15-chat-see-it-fixed", page.locator("figure").filter({ has: page.getByRole("slider") }).last(), { pad: 12 });
}
const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM)$/ }).first();
await slot.scrollIntoViewIfNeeded();
await shot("16-chat-slots", page.getByRole("region", { name: /^Book an? / }), { pad: 8 });
await slot.click();
await shot("16b-chat-confirm", page.getByRole("region", { name: /^Book an? / }), { pad: 8 });
await page.getByRole("button", { name: /Confirm booking/ }).click();
await page.getByText(/booked/i).first().waitFor();
await settle(800);
await shot("17-chat-booked");
const roofChat = page.url();

// ---------- 4. Customer chat, med spa ----------
await page.goto(`${BASE}/chat?tenant=luma-skin&q=${encodeURIComponent("Redness and sensitivity on my cheeks")}`);
await page.getByText(/Before you share a photo/i).waitFor();
await shot("18-spa-consent");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: /Continue to photo/ }).click();
await page.locator("input[type=file]").first().setInputFiles(photo);
await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
await page.getByText(/not a diagnosis/i).first().waitFor();
await settle(1000);
await shot("19-spa-result");

// ---------- 5. Owner dashboard, roofing ----------
await page.goto(`${BASE}/frontdesk?tenant=summit-ridge`, { waitUntil: "networkidle" });
const unstick = () => page.addStyleTag({ content: "header{position:static !important}" });
await unstick();
const sel = page.locator("header select").first();
if ((await sel.inputValue()) !== "summit-ridge") await sel.selectOption("summit-ridge");
await settle(1200);
await shot("20-dash-top");
await shot("21-dash-today", page.getByRole("region", { name: "Today in numbers" }));
await shot("22-dash-leads", page.getByRole("region", { name: "Leads" }));
await shot("23-dash-calendar", page.getByRole("region", { name: "Calendar" }));
await page.getByRole("button", { name: /^Assessment/ }).first().click();
await settle(1000);
const lead = page.getByRole("region", { name: "Leads" }).locator("li").first();
await shot("24-dash-lead-open", lead, { maxH: 760 });
await shot("25-dash-verification", page.getByRole("region", { name: "Verification" }).first());
await shot("26-dash-how-answered", page.getByRole("region", { name: "How the desk answered" }).first());
const claimHref = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("frontdesk.v2")).cases.find((x) => x.assessment && x.tenantId === "summit-ridge"); return c ? `/claim/${c.id}` : null; });
await page.goto(`${BASE}/frontdesk`, { waitUntil: "networkidle" });
await unstick();
await settle(600);
const storm = page.getByRole("region", { name: /Storm radar/i });
if (await storm.count()) {
  await scrollTo(storm);
  await settle(2500);
  await shot("27-dash-storm", storm);
}
const calls = page.getByRole("region", { name: /Calls|Phone/i });
if (await calls.count()) {
  await shot("28-dash-calls", calls);
  const play = calls.getByRole("button", { name: /rehearsed call/i });
  if (await play.count()) {
    await play.click();
    await calls.getByText(/Transcribing/).waitFor({ state: "detached" }).catch(() => {});
    await settle(1500);
    await shot("29-dash-call-result", calls);
  }
}
const re = page.getByRole("region", { name: /Reactivat|dead leads|Wake/i });
if (await re.count()) {
  await scrollTo(re);
  await shot("30-dash-reactivation", re);
  await re.getByRole("button", { name: /Draft re-openers/ }).click();
  await re.getByText(/Excluded \d+ opted-out/).waitFor({ timeout: 300000 });
  await re.getByRole("button", { name: /Michael Davis/ }).click().catch(() => {});
  await settle(1000);
  await shot("31-dash-reactivation-drafts", re);
}
await page.getByRole("button", { name: "Ask your desk" }).click();
const desk = page.getByRole("dialog", { name: "Your desk" });
await shot("32-desk-open", desk);
await desk.getByRole("button", { name: "Brief me" }).click();
await desk.getByText(/today:/).first().waitFor();
await desk.getByLabel("Ask your desk").fill("send the Larkspur quote");
await desk.getByLabel("Ask your desk").press("Enter");
await desk.getByText(/Larkspur/).nth(1).waitFor();
await settle(1200);
await shot("33-desk-answer", desk);
await desk.getByRole("button", { name: "Close" }).click();

// ---------- 6. Claim pack, eval, med spa dashboard ----------
if (claimHref) {
  await page.goto(`${BASE}${claimHref}`, { waitUntil: "networkidle" });
  await shot("34-claim-pack");
}
await page.goto(`${BASE}/eval`, { waitUntil: "networkidle" });
await shot("35-eval-start");
const runBtn = page.getByRole("button", { name: /Run/ }).first();
if (await runBtn.count()) {
  await runBtn.click();
  await page.waitForFunction(() => !document.querySelector("button[disabled]"), null, { timeout: 600000 }).catch(() => {});
  await settle(1500);
  await shot("36-eval-results");
}
await page.goto(`${BASE}/frontdesk`, { waitUntil: "networkidle" });
await page.locator("header select").first().selectOption("luma-skin");
await settle(1200);
await shot("37-dash-spa");

// ---------- 7. Setup a new business (guide 2) ----------
const SITE = {
  url: "https://bluebonnetroofing.example/",
  host: "bluebonnetroofing.example",
  title: "Bluebonnet Roofing Co. | Roof repair and replacement",
  siteName: "Bluebonnet Roofing Co.",
  description: "Family-run roofing company. Free roof inspections, storm damage repair and insurance claim help.",
  text: [
    "Bluebonnet Roofing Co.",
    "Family-run roofers. Proudly serving Austin, TX.",
    "Free roof inspections within 48 hours.",
    "Our services",
    "- Shingle repair: $350 - $900",
    "- Gutter cleaning: from $150",
    "- Leak detection: $199",
    "- Full roof replacement (quote after inspection)",
    "Storm damage? We help you with the insurance claim.",
    "Call us or send a photo of your roof.",
  ].join("\n"),
  pages: ["https://bluebonnetroofing.example/", "https://bluebonnetroofing.example/services"],
};
await page.route("**/api/site", async (route) => {
  await new Promise((r) => setTimeout(r, 1200));
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SITE) });
});
await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
await shot("40-setup-start");
await page.getByLabel("Business website").fill("bluebonnetroofing.example");
await page.getByRole("button", { name: /Build my front desk/ }).click();
await page.getByText("Building the desk from what it says").waitFor();
await shot("41-setup-reading");
await page.getByRole("region", { name: "Review the new desk" }).waitFor();
await settle(800);
await shot("42-setup-review", page.getByRole("region", { name: "Review the new desk" }));
await shot("43-setup-facts", page.getByRole("region", { name: "Review the new desk" }).locator(".fd-card"));
await shot("44-setup-preview", page.getByText("What customers will see").locator("xpath=.."));
await page.getByRole("button", { name: /Launch this desk/ }).click();
await page.waitForURL(/\/frontdesk/);
await settle(1200);
await shot("45-setup-launched");
const newId = await page.locator("header select").first().inputValue();
await page.goto(`${BASE}/chat?tenant=${newId}`, { waitUntil: "networkidle" });
await shot("46-setup-customer-view");
await say("Do you serve Austin?");
await page.getByText(/Checked the/).first().waitFor();
await settle(800);
await shot("47-setup-first-answer");
await say("How much is leak detection?");
await settle(800);
await shot("48-setup-price-answer");
await page.goto(`${BASE}/frontdesk`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^Assessment|^Details|^Open/ }).first().click().catch(() => {});
const trace = page.getByRole("region", { name: "How the desk answered" }).first();
if (await trace.count()) await shot("49-setup-trace", trace);
else await shot("49-setup-lead", page.getByRole("region", { name: "Leads" }));

fs.writeFileSync(path.join(OUT, "shots.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), done, roofChat }, null, 2));
log("done", done.length);
await browser.close();
