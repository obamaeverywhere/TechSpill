import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const origin = process.argv[2] || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("test-results", { recursive: true });
try {
  await page.goto(`${origin}/bangladesh`, { waitUntil: "networkidle" });
  await page.locator(".news-main .regional-card").first().waitFor();
  const data = await (
    await page.request.get(`${origin}/api/news/bangladesh?limit=50`)
  ).json();
  assert.ok(data.data.length > 0);
  assert.ok(
    data.data.every(
      (a) =>
        a.countryCodes.includes("BD") && a.classificationStatus === "ACCEPTED",
    ),
  );
  assert.ok(data.data.some((a) => a.language === "bn"));
  assert.ok(data.data.some((a) => a.language === "en"));
  assert.ok(await page.locator('.primary-nav a[href="/bangladesh"]').count());
  await page.screenshot({
    path: "test-results/bangladesh-desktop.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results/bangladesh-desktop-viewport.png",
  });
  const savedTitle = await page.locator(".news-main .hero-card h3").innerText();
  await page
    .locator(".news-main .hero-card")
    .getByRole("button", { name: /^Save / })
    .click();
  await page.locator(".nav-saved").click();
  await page.getByRole("heading", { name: "Your reading list." }).waitFor();
  await page.locator(".news-main article").first().waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.ok(
    (await page.locator(".news-main article").first().innerText()).includes(
      savedTitle,
    ),
  );
  await page
    .locator(".news-main")
    .getByRole("button", { name: /^Unsave / })
    .click();
  await page.locator('.primary-nav a[href="/bangladesh"]').click();
  await page.locator(".hero-card").waitFor();
  await page
    .getByRole("combobox", { name: "Article language" })
    .selectOption("bn");
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll(".news-main article")];
    return cards.length > 0 && cards.every((a) => a.lang === "bn");
  });
  const bn = data.data.find((a) => a.language === "bn");
  const keyword = bn.title
    .split(/\s+/)
    .find((word) => word.length > 4)
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
  await page
    .getByRole("searchbox", { name: "Search Bangladesh stories" })
    .fill(keyword);
  await page.getByRole("button", { name: "Submit Bangladesh search" }).click();
  await page.waitForURL(/search=/);
  await page.waitForFunction(
    () => !document.querySelector('.news-grid[aria-busy="true"]'),
  );
  await page
    .getByRole("combobox", { name: "Bangladesh publisher" })
    .selectOption(bn.source.slug);
  await page.waitForURL(/source=/);
  await page.waitForFunction(
    () => !document.querySelector('.news-grid[aria-busy="true"]'),
  );
  if (bn.categories[0]) {
    await page.getByTitle(bn.categories[0].name, { exact: true }).click();
    await page.waitForURL(/category=/);
  }
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByLabel("Bangladesh published from", { exact: true })
    .fill("2020-01-01");
  await page.waitForURL(/dateFrom=/);
  const filterUrl = new URL(page.url());
  assert.equal(filterUrl.searchParams.get("language"), "bn");
  assert.equal(filterUrl.searchParams.get("source"), bn.source.slug);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.locator(".hero-card").waitFor();
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  const headerSearch = page.getByRole("searchbox", {
    name: "Search Bangladesh technology news",
  });
  await headerSearch.fill("Bangladesh");
  await headerSearch.press("Enter");
  await page.waitForURL(/\/bangladesh\?search=Bangladesh/);
  assert.equal(new URL(page.url()).pathname, "/bangladesh");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.locator(".hero-card").waitFor();
  await page
    .locator(".bd-feed-tabs")
    .getByRole("button", { name: "Trending", exact: true })
    .click();
  await page.waitForURL(/sort=trending/);
  await page
    .locator(".bd-latest h2")
    .getByText("Trending in Bangladesh")
    .waitFor();
  if (data.meta.total > 10) {
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.waitForURL(/page=2/);
    await page.getByText(/^Page 2 of /).waitFor();
  }
  await page.goto(`${origin}/bangladesh`, { waitUntil: "networkidle" });
  await page.locator(".bd-source-limitations summary").click();
  assert.ok(
    (await page.locator(".bd-source-limitations").innerText()).includes("BTRC"),
  );
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.screenshot({
    path: "test-results/bangladesh-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({
    path: "test-results/bangladesh-mobile.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results/bangladesh-mobile-viewport.png",
  });
  await page
    .getByRole("combobox", { name: "Article language" })
    .selectOption("bn");
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll(".news-main article")];
    return cards.length > 0 && cards.every((a) => a.lang === "bn");
  });
  await page
    .locator(".news-main .article-card")
    .first()
    .screenshot({ path: "test-results/bangladesh-bengali-card.png" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Global Tech News", exact: true })
    .click();
  await page.waitForURL(`${origin}/`);
  await page.locator(".news-main article").first().waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `Bangladesh browser checks passed with ${data.meta.total} real accepted stories: English/Bengali, filters, local search, bookmarks, themes, pagination, mobile, and global navigation.`,
  );
} finally {
  await browser.close();
}
