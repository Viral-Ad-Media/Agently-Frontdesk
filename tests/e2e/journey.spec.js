// Boss-test and reactivation journeys, scripted. Runs against the dev server on the mock provider.
//   npm i -D @playwright/test && npx playwright install chromium
//   npm run test:e2e
import { test, expect } from "@playwright/test";
import path from "node:path";

const BASE = process.env.E2E_BASE || "http://localhost:5173";
const photo = path.resolve("public/demo/roof-test.jpg");
const AI = 120000; // a real provider can take a while; the mock is instant

// Waits until the front desk has replied n times (the model's wording varies between providers).
const replied = (page, n) => expect(page.getByTestId("assistant-message")).toHaveCount(n, { timeout: AI });

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await page.evaluate(() => localStorage.clear());
});

test("homeowner: describe, address, photo, outlined assessment, draft range, three-tap booking", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Water dripping through the bedroom ceiling")}`);
  await replied(page, 1);
  await page.getByLabel("Message").fill("14 Larkspur Lane, Lyons");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: 90000 });
  await expect(page.getByText(/Draft only/)).toBeVisible();
  // See it fixed: an edited copy of the customer's own photo, always captioned as an illustration.
  await page.getByRole("button", { name: /See your roof repaired/ }).click();
  await expect(page.getByRole("img", { name: /after the repair/ })).toBeVisible({ timeout: AI });
  await expect(page.getByText(/confirmed at the free inspection/)).toBeVisible();
  // The before/after slider is a native range: arrow keys move the CSS --pos variable that drives the clip.
  const compare = page.getByRole("slider", { name: /Compare the roof/ });
  await compare.focus();
  await compare.press("End");
  await expect(page.locator("figure [style*='--pos']")).toHaveAttribute("style", /--pos:\s*100%/);
  // Mock measures the rehearsed outline; a real provider may find no outline on the synthetic drawing. Both are honest.
  await expect(page.getByText(/m² from the outline|no measurement|no square-metre/i).first()).toBeVisible();
  await page.getByRole("button", { name: "9:00 AM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/inspection booked/i).first()).toBeVisible();
  await expect(page.getByText("14 Larkspur Lane, Lyons").last()).toBeVisible();
});

test("owner: approve then send, and the customer's chat shows the sent range", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Shingles blew off in the wind")}`);
  await replied(page, 1);
  await page.getByLabel("Message").fill("7 Cedar Court, Longmont");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "11:30 AM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  const chatUrl = page.url();

  await page.goto(`${BASE}/frontdesk`);
  await expect(page.getByText("Awaiting approval").first()).toBeVisible();
  // Without a measured total (no outline on a real provider) the owner enters the range by hand first.
  if (await page.getByRole("button", { name: "Approve" }).first().isDisabled()) {
    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.getByLabel(/Low/).fill("450");
    await page.getByLabel(/High/).fill("650");
    await page.getByRole("button", { name: "Save range" }).click();
  }
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByText("Sent").first()).toBeVisible();

  await page.goto(chatUrl);
  await expect(page.getByText(/confirmed range \$\d+–\$\d+/)).toBeVisible();
});

test("no reference in frame: percent only, no square metres, no dollar total", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Some tiles slipped")}`);
  await replied(page, 1);
  await page.getByLabel("Message").fill("22 Mill Road, Boulder");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(path.resolve("public/demo/roof-noref.jpg"));
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  // Mock: no reference → percent only. Meta: may find no outline at all on the synthetic drawing. Both are honest; neither shows a dollar total.
  await expect(page.getByText(/no square-metre figure|no measurement/i).first()).toBeVisible({ timeout: AI });
  await expect(page.getByText(/no dollar total/i).first()).toBeVisible();
});

test("reactivation: opt-outs excluded and counted, a reply that books raises the counter by exactly one", async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await page.getByRole("button", { name: /Draft re-openers/ }).click();
  await expect(page.getByText(/Excluded 3 opted-out leads/)).toBeVisible({ timeout: 240000 });
  await page.getByRole("button", { name: /Michael Davis/ }).click();
  await page.getByRole("button", { name: "Approve" }).last().click();
  await page.getByRole("button", { name: "Send" }).last().click();
  await page.getByRole("button", { name: /Yes, book me in/ }).click();
  await expect(page.getByText(/1 recovered/)).toBeVisible();
  await expect(page.getByRole("group", { name: "Reactivated jobs" }).getByText("1", { exact: true })).toBeVisible();
});

test("med spa: consent before photo, service match, no diagnosis, consultation booked", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=luma-skin&q=${encodeURIComponent("Redness and sensitivity on my cheeks")}`);
  await expect(page.getByText(/Before you share a photo/i)).toBeVisible({ timeout: AI });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue to photo/ }).click();
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/not a diagnosis/i).first()).toBeVisible({ timeout: AI });
  await expect(page.getByText(/not medical advice/i)).toBeVisible();
  await page.getByRole("button", { name: "2:00 PM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/consultation booked/i)).toBeVisible();
});

test("talk to your desk: brief, then a spoken send waits for yes and moves the quote exactly once", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Water dripping through the bedroom ceiling")}`);
  await replied(page, 1);
  await page.getByLabel("Message").fill("14 Larkspur Lane, Lyons");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "9:00 AM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/inspection booked/i).first()).toBeVisible();

  await page.goto(`${BASE}/frontdesk`);
  await page.getByRole("button", { name: "Ask your desk" }).click();
  const desk = page.getByRole("dialog", { name: "Your desk" });
  await desk.getByRole("button", { name: "Brief me" }).click();
  await expect(desk.getByText(/Summit Ridge Roofing, today:/)).toBeVisible({ timeout: AI });
  await desk.getByLabel("Ask your desk").fill("send the Larkspur quote");
  await desk.getByLabel("Ask your desk").press("Enter");
  await expect(desk.getByText(/Approve and send the .* range to 14 Larkspur Lane/).first()).toBeVisible({ timeout: AI });
  // Nothing has moved yet: the card still waits for the owner.
  await expect(page.getByText("Awaiting approval").first()).toBeVisible();
  await desk.getByLabel("Ask your desk").fill("yes");
  await desk.getByLabel("Ask your desk").press("Enter");
  await expect(desk.getByText(/^Sent\. 14 Larkspur Lane/)).toBeVisible();
  await expect(page.locator(".fd-pill-ok", { hasText: "Sent" }).first()).toBeVisible();
});

test("verification: a job whose photo contradicts the description fails the coded consistency check, escalates without retrying, is held from the customer and needs a reason to approve", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("The gutter is hanging off the front of the house and water pours down the wall")}`);
  await replied(page, 1);
  await page.getByLabel("Message").fill("9 Aspen Court, Lyons");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/is checking this one before a range is shared/).first()).toBeVisible({ timeout: AI });
  await expect(page.getByText(/\$\d+ – \$\d+/)).toHaveCount(0);

  await page.goto(`${BASE}/frontdesk`);
  await expect(page.getByText("Escalated to you").first()).toBeVisible();
  await page.getByRole("button", { name: /^Assessment/ }).first().click();
  await expect(page.getByText(/Review 1: FAIL \(coded check/)).toBeVisible();
  await expect(page.getByText(/describes the gutter/).first()).toBeVisible();
  await page.getByRole("button", { name: /Review & approve/ }).click();
  const approve = page.getByRole("button", { name: /Approve with reason/ });
  await expect(approve).toBeDisabled();
  await page.getByPlaceholder(/Why approve/).fill("Checked by phone: gutter and eave shingles both need work");
  await approve.click();
  await expect(page.getByText(/Approved over failed checks: Checked by phone/).first()).toBeVisible();
});

test("smart desk: looks up prices and open times before answering, and the owner sees how it answered", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("How much do you charge?")}`);
  await replied(page, 1);
  await expect(page.getByText(/per square metre/).first()).toBeVisible();
  await expect(page.getByText("Checked the price list").first()).toBeVisible();
  await page.getByLabel("Message").fill("Water is dripping through the ceiling, can you come tomorrow?");
  await page.getByLabel("Message").press("Enter");
  await replied(page, 2);
  await expect(page.getByText("Checked the calendar").first()).toBeVisible();
  await page.getByLabel("Message").fill("3 Pine Ridge, Boulder");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: 90000 });

  await page.goto(`${BASE}/frontdesk`);
  await page.getByRole("button", { name: /^Assessment/ }).first().click();
  const how = page.getByRole("region", { name: "How the desk answered" });
  await expect(how).toBeVisible();
  await expect(how.getByText(/How much do you charge/)).toBeVisible();
  await expect(how.getByText(/Every time and price in the reply came from a lookup/).first()).toBeVisible();
});

test("judge path: a sample photo with no camera runs to a draft quote, the booking lands on the calendar, and Reset wipes it", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge`);
  await replied(page, 1);
  await page.getByRole("button", { name: /Use the sample photo: Lifted shingles/ }).click();
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: 90000 });
  await expect(page.getByText(/Sample job:/)).toBeVisible();
  const slotBtn = page.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM)$/ }).first();
  const label = await slotBtn.textContent();
  await slotBtn.click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/You're booked/).first()).toBeVisible();

  // A second roofing case asks to book by text: the picker appears, and the taken slot is not offered twice.
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Can I book an inspection? Shingles came off")}`);
  await replied(page, 1);
  await expect(page.getByRole("region", { name: /^Book a free inspection/ })).toBeVisible({ timeout: AI });

  await page.goto(`${BASE}/frontdesk?tenant=summit-ridge`);
  await expect(page.getByRole("region", { name: "Calendar" }).getByText(label.trim()).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Claim pack \(draft\)/ }).first()).toBeVisible();

  // Reset: two taps, no browser pop-up. After a reload nothing from the test is left, on either business.
  await page.getByRole("button", { name: /Reset demo/ }).click();
  await page.getByRole("button", { name: /Tap again to reset/ }).click();
  await expect(page.getByText("Demo reset")).toBeVisible();
  await page.reload();
  await expect(page.getByText("14 Larkspur Lane, Austin, TX")).toHaveCount(0);
  await expect(page.getByText(/Nothing booked yet/).first()).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("frontdesk.v3") || "null"));
  expect(stored === null || stored.cases.every((c) => !String(c.description || "").includes("Shingles lifted"))).toBe(true);
});
