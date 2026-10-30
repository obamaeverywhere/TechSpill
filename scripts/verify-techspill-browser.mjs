import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin =
  process.argv[2] || process.env.BROWSER_TEST_ORIGIN || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
await mkdir("test-results", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  failedApis = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.url().includes("/api/") && r.status() >= 400)
    failedApis.push(`${r.status()} ${r.url()}`);
});
function luminance(hex) {
  if (/^#[a-f0-9]{3}$/i.test(hex))
    hex = "#" + [...hex.slice(1)].map((v) => v + v).join("");
  const values = hex
    .replace("#", "")
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
const report = {
  contrast: [],
  viewports: [],
  migration: false,
  keyboard: false,
  reducedMotion: false,
};
try {
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator(".hero-card").waitFor();
  assert.equal(await page.title(), "TechSpill — Spilling What's Next.");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal((await page.request.get(`${origin}/favicon.svg`)).status(), 200);
  assert.equal(
    (await page.request.get(`${origin}/theme-init.js`)).status(),
    200,
  );
  assert.ok(
    (
      await page.locator('meta[name="description"]').getAttribute("content")
    ).includes("BD tech scene"),
  );
  for (const theme of ["dark", "light"]) {
    if (theme === "light")
      await page.getByRole("button", { name: "Switch to light mode" }).click();
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement),
        value = (n) => s.getPropertyValue(`--${n}`).trim();
      return Object.fromEntries(
        [
          "bg",
          "surface",
          "surface-raised",
          "surface-hover",
          "hero-tint",
          "text",
          "muted",
          "subtle",
          "purple-text",
          "accent-text",
          "lime",
        ].map((n) => [n, value(n)]),
      );
    });
    for (const foreground of [
      "text",
      "muted",
      "subtle",
      "purple-text",
      "accent-text",
    ]) {
      for (const background of [
        "bg",
        "surface",
        "surface-raised",
        "surface-hover",
        "hero-tint",
      ]) {
        const ratio = contrast(tokens[foreground], tokens[background]);
        assert.ok(
          ratio >= 4.5,
          `${theme}: ${foreground} on ${background} contrast ${ratio.toFixed(2)}`,
        );
        report.contrast.push({
          theme,
          foreground,
          background,
          ratio: Number(ratio.toFixed(2)),
        });
      }
    }
    assert.ok(contrast("#111118", tokens.lime) >= 4.5);
    await page.screenshot({
      path: `test-results/techspill-${theme}-viewport.png`,
    });
  }
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search technology news" })
    .fill("AI");
  await page.locator(".search-result").first().waitFor();
  assert.ok(await page.locator(".search-result mark").count());
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => !!document.activeElement.closest(".search-dialog"),
    ),
    true,
  );
  await page.locator(".brand-link").evaluate((e) => e.focus());
  assert.equal(
    await page.evaluate(
      () => !!document.activeElement.closest(".search-dialog"),
    ),
    true,
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector(".search-dialog").open,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Open search", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  report.keyboard = true;
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".article-card")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  report.reducedMotion = true;
  // Resize in place to exercise breakpoint transitions without repeatedly fetching the same news.
  for (const route of ["/", "/bangladesh", "/sources", "/saved"]) {
    if (route !== "/")
      await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${route} overflows at ${width}px`,
      );
      report.viewports.push({ route, width });
    }
  }
  const articles = await (
    await page.request.get(`${origin}/api/news?limit=1`)
  ).json();
  const id = articles.data[0].id;
  const migrated = await browser.newPage();
  await migrated.addInitScript((savedId) => {
    localStorage.setItem("techpulse.saved", JSON.stringify([savedId]));
    localStorage.setItem("techpulse.theme", "light");
  }, id);
  await migrated.goto(`${origin}/saved`, { waitUntil: "networkidle" });
  await migrated.locator(".news-main .article-card").first().waitFor();
  const preferences = await migrated.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    saved: JSON.parse(localStorage.getItem("techspill.saved")),
  }));
  assert.equal(preferences.theme, "light");
  assert.deepEqual(preferences.saved, [id]);
  await migrated.reload({ waitUntil: "networkidle" });
  assert.equal(await migrated.locator(".news-main .article-card").count(), 1);
  await migrated.close();
  report.migration = true;
  assert.deepEqual(errors, []);
  assert.deepEqual(failedApis, []);
  await writeFile(
    "test-results/techspill-verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    `TechSpill checks passed: ${report.contrast.length} text contrast pairs, ${report.viewports.length} route/viewport layouts, metadata/assets, focus containment/return, reduced motion, and legacy bookmark/theme migration.`,
  );
} finally {
  await browser.close();
}
