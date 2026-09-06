import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = "/tmp/pm-tool-shots-nav";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

await page.goto("http://demo.localhost:3000/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "demo@demo.de");
await page.fill('input[type="password"]', process.argv[2] ?? "");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(500);

await page.getByRole("button", { name: "Projektmanagement" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/arbeiten-open.png` });

await page.getByRole("button", { name: "Mehr" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/mehr-open.png` });

// mobile viewport check
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/mobile-dashboard.png` });
await page.getByLabel("Navigation öffnen").click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/mobile-nav-open.png` });

await browser.close();
console.log("--- errors ---");
console.log(errors.length ? errors.join("\n") : "(none)");
