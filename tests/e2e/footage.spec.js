// Raw footage for the demo video: each scene of docs/DEMO_SCRIPT.md, driven slowly on the live product
// and recorded by Playwright. Run against the Meta provider so the badge reads "Meta models".
//   npx playwright test tests/e2e/footage.spec.js --config playwright.footage.config.js
// Clips land in footage/<scene>/video.webm. No cuts, no mock-ups: what you see is the product running.
import { test, expect } from "@playwright/test";
import path from "node:path";

const BASE = process.env.E2E_BASE || "http://localhost:5173";
const photo = path.resolve("public/demo/roof-test.jpg");
const AI = 180000;
const beat = (page, ms = 1500) => page.waitForTimeout(ms);
const replied = (page, n) => expect(page.getByTestId("assistant-message")).toHaveCount(n, { timeout: AI });
const typeSlowly = async (page, text) => {
  const box = page.getByLabel("Message");
  await box.click();
  await box.pressSequentially(text, { delay: 35 });
  await beat(page, 600);
  await box.press("Enter");
};

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await page.evaluate(() => localStorage.clear());
});

test("scene 1-3: the leak, photo to assessment, three taps to book", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await beat(page, 2500);
  await page.getByLabel(/Describe the roof problem/).click();
  await page.getByLabel(/Describe the roof problem/).pressSequentially("Water dripping through the bedroom ceiling since the storm", { delay: 35 });
  await beat(page, 800);
  await page.getByRole("button", { name: /Start/ }).click();
  await replied(page, 1);
  await beat(page, 2500);
  await typeSlowly(page, "14 Larkspur Lane, Lyons");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await beat(page, 2500);
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await expect(page.getByRole("button", { name: /Use this photo|Use it anyway/ })).toBeVisible({ timeout: 10000 });
  await beat(page, 2000);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: AI });
  await beat(page, 6000);
  await page.mouse.wheel(0, 400);
  await beat(page, 2500);
  await page.getByRole("button", { name: "9:00 AM" }).first().click();
  await beat(page, 1500);
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/inspection booked/i).first()).toBeVisible();
  await beat(page, 4000);
});

test("scene 4: the owner's one screen", async ({ page }) => {
  await page.goto(`${BASE}/chat?tenant=summit-ridge&q=${encodeURIComponent("Shingles blew off in the wind last night")}`);
  await replied(page, 1);
  await typeSlowly(page, "7 Cedar Court, Longmont");
  await expect(page.getByText(/Add a photo of the damage/i)).toBeVisible({ timeout: AI });
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/Draft quote/i)).toBeVisible({ timeout: AI });
  await page.getByRole("button", { name: "11:30 AM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/inspection booked/i).first()).toBeVisible();
  const chatUrl = page.url();

  await page.goto(`${BASE}/frontdesk`);
  await beat(page, 3000);
  // Correct the outline first (a sent quote is never changed), then approve and send.
  await page.getByRole("button", { name: "Show assessment" }).first().click();
  await beat(page, 2500);
  await page.getByRole("button", { name: /Correct the outline|Draw the outline/ }).click();
  await beat(page, 1500);
  const handle = page.locator("svg.touch-none circle").nth(1);
  const b = await handle.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 60, b.y - 40, { steps: 20 });
    await page.mouse.up();
  }
  await beat(page, 1200);
  await page.getByRole("button", { name: /Save corrected outline/ }).click();
  await beat(page, 3000);
  await page.getByRole("button", { name: "Hide assessment" }).first().click();
  await beat(page, 1500);
  if (await page.getByRole("button", { name: "Approve" }).first().isDisabled()) {
    await page.getByRole("button", { name: "Edit" }).first().click();
    await beat(page, 800);
    await page.getByLabel(/Low/).pressSequentially("450", { delay: 80 });
    await page.getByLabel(/High/).pressSequentially("650", { delay: 80 });
    await beat(page, 600);
    await page.getByRole("button", { name: "Save range" }).click();
    await beat(page, 1200);
  }
  await page.getByRole("button", { name: "Approve" }).first().click();
  await beat(page, 1500);
  await page.getByRole("button", { name: "Send" }).first().click();
  await beat(page, 2500);
  await page.goto(chatUrl);
  await beat(page, 3500);
});

test("scene 5: dead leads back to revenue", async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await beat(page, 2000);
  await page.getByRole("button", { name: /Draft re-openers/ }).scrollIntoViewIfNeeded();
  await beat(page, 1500);
  await page.getByRole("button", { name: /Draft re-openers/ }).click();
  await expect(page.getByText(/Excluded 3 opted-out leads/)).toBeVisible({ timeout: 300000 });
  await beat(page, 3000);
  await page.getByRole("button", { name: /Michael Davis/ }).click();
  await beat(page, 3500);
  await page.getByRole("button", { name: "Approve" }).last().click();
  await beat(page, 1200);
  await page.getByRole("button", { name: "Send" }).last().click();
  await beat(page, 1500);
  await page.getByRole("button", { name: /Yes, book me in/ }).click();
  await beat(page, 2500);
  await page.mouse.wheel(0, -2000);
  await beat(page, 3500);
});

test("scene 6: same spine, second trade (med spa)", async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await beat(page, 1500);
  await page.getByLabel("Switch demo tenant").selectOption("luma-skin");
  await beat(page, 2500);
  await page.goto(`${BASE}/chat?tenant=luma-skin&q=${encodeURIComponent("Redness and sensitivity on my cheeks that flares up after sun")}`);
  await expect(page.getByText(/Before you share a photo/i)).toBeVisible({ timeout: AI });
  await beat(page, 3000);
  await page.getByRole("checkbox").check();
  await beat(page, 800);
  await page.getByRole("button", { name: /Continue to photo/ }).click();
  await beat(page, 1500);
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.getByRole("button", { name: /Use this photo|Use it anyway/ }).click();
  await expect(page.getByText(/not a diagnosis/i).first()).toBeVisible({ timeout: AI });
  await beat(page, 6000);
  await page.getByRole("button", { name: "2:00 PM" }).first().click();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText(/consultation booked/i)).toBeVisible();
  await beat(page, 3000);
});

test("scene 7: the daily summary", async ({ page }) => {
  await page.goto(`${BASE}/frontdesk`);
  await beat(page, 1500);
  await page.getByLabel("Switch demo tenant").selectOption("summit-ridge");
  await beat(page, 4000);
});
