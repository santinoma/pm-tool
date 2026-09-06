import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));
await page.goto("http://admin.localhost:3000/tenants", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/pm-tool-shots-nav/admin-tenants.png", fullPage: true });
await browser.close();
console.log(errors.length ? errors.join("\n") : "(no errors)");
