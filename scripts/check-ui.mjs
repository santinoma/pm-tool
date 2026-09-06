import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = process.argv[2] ?? "/tmp/pm-tool-shots";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

async function shot(name) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`saved ${name}.png`);
}

await page.goto("http://demo.localhost:3000/login", { waitUntil: "networkidle" });
await shot("01-login");

await page.fill('input[type="email"]', "demo@demo.de");
await page.fill('input[type="password"]', process.argv[3] ?? "");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {});
await shot("02-dashboard-light");

// three-dot / account menu — try common triggers
const accountTrigger = page.locator('button[aria-label="Konto-Menü"]');
if (await accountTrigger.count()) {
  await accountTrigger.click();
  await shot("03-account-menu-light");
  await page.keyboard.press("Escape");
}

await page.goto("http://demo.localhost:3000/settings", { waitUntil: "networkidle" });
await shot("04-settings-light");

// toggle dark mode via theme toggle button
const themeToggle = page.locator('button[aria-label*="Design"]').first();
if (await themeToggle.count()) {
  await themeToggle.click();
  await shot("05-settings-dark");
}

await page.goto("http://demo.localhost:3000/dashboard", { waitUntil: "networkidle" });
await shot("06-dashboard-dark");
if (await accountTrigger.count()) {
  await accountTrigger.click();
  await shot("07-account-menu-dark");
}

await browser.close();

console.log("\n--- console/page errors ---");
console.log(errors.length ? errors.join("\n") : "(none)");
