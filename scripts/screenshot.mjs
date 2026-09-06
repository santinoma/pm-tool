import { chromium } from "playwright";

const [, , url, outPath, cookieSpec] = process.argv;
if (!url || !outPath) {
  console.error("Usage: node screenshot.mjs <url> <outPath> [name=value;domain=...]");
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

if (cookieSpec) {
  const [pair, domain] = cookieSpec.split(";domain=");
  const [name, value] = pair.split("=");
  await context.addCookies([{ name, value, domain: domain || "localhost", path: "/" }]);
}

const page = await context.newPage();
const consoleMessages = [];
page.on("console", (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => consoleMessages.push(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved to ${outPath}`);
if (consoleMessages.length) {
  console.log("Console messages:");
  for (const m of consoleMessages) console.log(" ", m);
} else {
  console.log("No console messages.");
}
