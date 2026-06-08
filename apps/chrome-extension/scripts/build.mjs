import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const sourceIcon = path.resolve(root, "../../frontend/public/scanpdf-icon.png");

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "icons"), { recursive: true });
for (const file of ["manifest.json", "popup.html", "popup.css", "popup.js"]) {
  await cp(path.join(root, file), path.join(dist, file));
}
for (const size of [16, 32, 48, 128]) {
  await cp(sourceIcon, path.join(dist, "icons", `icon-${size}.png`));
}
console.log(`Chrome Extension đã build tại ${dist}`);
