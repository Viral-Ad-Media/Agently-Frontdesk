// Boss-test and reactivation journeys, scripted. Runs against the dev server on the mock provider.
//   npm i -D @playwright/test && npx playwright install chromium
//   npm run test:e2e
import { test, expect } from "@playwright/test";
import path from "node:path";

const BASE = process.env.E2E_BASE || "http://localhost:5173";
const photo = path.resolve("public/demo/roof-test.jpg");

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await page.evaluate(() => localStorage.clear());
});

test("homeowner: describe, address, photo, outlined assessment, draft range, three-tap booking", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Water dripping through the bedroom ceiling")}`);
  await expect(page.getByText(/address of the property/i)).toBeVisible();
  await page.getByLabel("Message").fill("14 Larkspur Lane, Lyons");
  await page.getByLabel("Message").press("Enter");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible();
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Draft only/)).toBeVisible();
  await expect(page.getByText(/m² from the outline/)).toBeVisible();
  await page.getByRole("button", { name: "9:00 AM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/booked/i).first()).toBeVisible();
  await expect(page.getByText("14 Larkspur Lane, Lyons").last()).toBeVisible();
});

test("owner: approve then send, and the customer's chat shows the sent range", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Shingles blew off in the wind")}`);
  await page.getByLabel("Message").fill("7 Cedar Court, Longmont");
  await page.getByLabel("Message").press("Enter");
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await page.getByRole("button", { name: "11:30 AM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  const chatUrl = page.url();

  await page.goto(`${BASE}/frontdesk`);
  await expect(page.getByText("Awaiting approval").first()).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByText("Sent").first()).toBeVisible();

  await page.goto(chatUrl);
  await expect(page.getByText(/confirmed range \$\d+–\$\d+/)).toBeVisible();
});

test("no reference in frame: percent only, no square metres, no dollar total", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Some tiles slipped")}`);
  await page.getByLabel("Message").fill("22 Mill Road, Boulder");
  await page.getByLabel("Message").press("Enter");
  await page.locator('input[type=file]').first().setInputFiles(path.resolve("public/demo/roof-noref.jpg"));
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/no square-metre figure/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/no dollar total/i)).toBeVisible();
});

test("reactivation: opt-outs excluded and counted, a reply that books raises the counter by exactly one", async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await page.getByRole("button", { name: /Draft re-openers/ }).click();
  await expect(page.getByText(/Excluded 3 opted-out leads/)).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: /Michael Davis/ }).click();
  await page.getByRole("button", { name: "Approve" }).last().click();
  await page.getByRole("button", { name: "Send" }).last().click();
  await page.getByRole("button", { name: /Yes, book me in/ }).click();
  await expect(page.getByText(/1 recovered/)).toBeVisible();
  await expect(page.getByText("Jobs reactivated").locator("..").getByText("1")).toBeVisible();
});

test("med spa: consent before photo, service match, no diagnosis, consultation booked", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=luma-skin&q=${encodeURIComponent("Redness and sensitivity on my cheeks")}`);
  await expect(page.getByText(/confirm consent/i)).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue to photo/ }).click();
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/not a diagnosis/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/not medical advice/i)).toBeVisible();
  await page.getByRole("button", { name: "2:00 PM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/consultation booked/i)).toBeVisible();
});
