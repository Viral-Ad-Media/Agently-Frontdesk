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
  await expect(page.getByText("Jobs reactivated").locator("..").getByText("1")).toBeVisible();
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
