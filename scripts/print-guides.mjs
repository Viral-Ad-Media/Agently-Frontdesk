// Prints the guide HTML files to PDF.  node scripts/print-guides.mjs <dir>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const dir = path.resolve(process.argv[2]);
const launch = { args: ["--no-sandbox"] };
if (fs.existsSync("/opt/pw-browsers/chromium")) launch.executablePath = "/opt/pw-browsers/chromium";
const b = await chromium.launch(launch);
const p = await b.newPage();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
  await p.goto("file://" + path.join(dir, f), { waitUntil: "load" });
  await p.pdf({ path: path.join(dir, f.replace(".html", ".pdf")), format: "A4", landscape: true, printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
  console.log("pdf", f);
}
await b.close();
