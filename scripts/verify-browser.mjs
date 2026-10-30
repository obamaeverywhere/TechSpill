import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

// Opt-in browser smoke test against a running app with real collected articles.
const origin =
  process.argv[2] || process.env.BROWSER_TEST_ORIGIN || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("test-results", { recursive: true });
try {
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator(".news-main article").first().waitFor();
  assert.equal(await page.locator("main .article-card").count(), 9);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });

  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Search technology news",
  });
  await search.fill("AI");
  await page.locator(".search-result").first().waitFor();
  await search.press("ArrowDown");
  assert.equal(
    await page
      .locator("#search-result-0")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Home");
  await page.screenshot({ path: "test-results/search-desktop.png" });
  await search.press("Enter");
  await page.waitForURL("**/?q=AI");
  await page.getByRole("heading", { name: "Results for “AI”" }).waitFor();
  await page.locator(".news-main article").first().waitFor();
  assert.ok(await page.locator(".news-main mark").count());
  await page.getByRole("button", { name: "Compact view" }).click();
  assert.ok(await page.locator(".news-main .compact-card").count());
  await page.getByRole("button", { name: "Grid view" }).click();
  await page
    .locator(".category-strip")
    .getByRole("button", { name: "AI", exact: true })
    .click();
  await page.waitForURL(/category=artificial-intelligence/);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("checkbox", { name: "TechCrunch", exact: true }).click();
  await page.waitForURL(/source=techcrunch/);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('input[type="checkbox"]')].some(
      (input) =>
        input.closest("label")?.textContent.includes("TechCrunch") &&
        input.checked,
    ),
  );
  await page.getByLabel("Published from", { exact: true }).fill("2026-10-01");
  await page.waitForURL(/from=/);
  await page
    .getByRole("combobox", { name: "Sort articles" })
    .selectOption("trending");
  await page.waitForURL(/sort=trending/);
  assert.equal(
    await page.locator('.filter-panel input[type="checkbox"]:checked').count(),
    1,
  );
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page.locator(".hero-card").waitFor();
  await page
    .locator(".hero-card")
    .getByRole("button", { name: /^Save / })
    .click();
  await page.locator(".nav-saved").click();
  await page.getByRole("heading", { name: "Your reading list." }).waitFor();
  await page.locator(".news-main article").first().waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".news-main article").count(), 1);
  await page.getByRole("button", { name: /^Unsave / }).click();
  await page
    .getByRole("heading", { name: "Good stories deserve a second look." })
    .waitFor();

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.locator('.primary-nav a[href="/"]').click();
  await page.locator(".hero-card").waitFor();
  await page.screenshot({ path: "test-results/light.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("link", { name: "News sources", exact: true }).click();
  await page.locator(".source-card").first().waitFor();
  assert.equal(await page.locator(".source-card").count(), 7);
  await page.screenshot({ path: "test-results/sources.png", fullPage: true });
  await page.getByRole("button", { name: "About TechSpill" }).click();
  await page.getByRole("dialog", { name: "Meet TechSpill." }).waitFor();
  await page.keyboard.press("Escape");

  await page.locator('.primary-nav a[href="/"]').click();
  await page.locator(".hero-card").waitFor();
  await page.getByRole("button", { name: "Next page" }).click();
  await page.waitForURL(/page=2/);
  await page.getByText(/^Page 2 of /).waitFor();
  await page.locator(".news-main article").first().waitFor();
  assert.equal(await page.locator(".hero-card").count(), 0);
  await page.keyboard.press("Control+k");
  assert.equal(
    await search.evaluate((e) => e === document.activeElement),
    true,
  );
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  assert.equal(
    await page.locator("#main-navigation").evaluate((e) => e.open),
    false,
  );
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("button", { name: "Search" })
    .click();
  await page
    .getByRole("searchbox", { name: "Search technology news" })
    .fill("AI");
  await page.locator(".search-result").first().waitFor();
  await page.screenshot({ path: "test-results/search-mobile.png" });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator(".mobile-bottom-nav button")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  assert.equal(
    await page.locator("#main-navigation").evaluate((e) => e.open),
    true,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('#main-navigation a[href="/trending"]').click();
  await page.getByRole("heading", { name: "Hot Right Now." }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Open navigation" })
      .getAttribute("aria-expanded"),
    "false",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: desktop/mobile, combined filters, search, pagination, saved persistence, themes, sources, dialog and keyboard navigation.",
  );
} finally {
  await browser.close();
}
