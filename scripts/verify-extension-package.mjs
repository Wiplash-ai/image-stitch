import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { unzipSync } from "fflate";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const archiveName = `glassware-${packageJson.version}-chromium.zip`;
const storeTarget = resolve(root, "artifacts/store/chromium");
const archive = new Uint8Array(await readFile(resolve(storeTarget, archiveName)));
const files = unzipSync(archive);

assert(files["manifest.json"], "manifest.json must be at the ZIP root");
const manifest = JSON.parse(Buffer.from(files["manifest.json"]).toString("utf8"));
assert(manifest.manifest_version === 3, "the store package must use Manifest V3");
assert(manifest.version === packageJson.version, "manifest and package versions must match");
assert(JSON.stringify(manifest.permissions) === JSON.stringify(["activeTab", "contextMenus", "identity", "storage"]), "permissions must stay on the reviewed allowlist");
assert(!manifest.permissions.includes("tabs"), "the broad tabs permission is not allowed");
assert(JSON.stringify(manifest.optional_host_permissions) === JSON.stringify(["https://auth.wiplash.ai/*"]), "optional sign-in host permission must stay narrowly scoped");
assert(JSON.stringify(manifest.host_permissions) === JSON.stringify([
  "https://api.openverse.org/*",
  "https://fonts.googleapis.com/*",
  "https://fonts.gstatic.com/*",
]), "host permissions must stay on the reviewed allowlist");
assert(manifest.content_security_policy?.extension_pages === "script-src 'self'; object-src 'self'", "extension pages need the reviewed CSP");
assert(files["background.js"], "the extension background worker is missing");
assert(!manifest.action?.default_popup, "the toolbar action must open the main GlassWare app directly");
assert(!files["popup.html"] && !files["popup.js"] && !files["popup.css"], "the retired toolbar popup must not ship");
const background = Buffer.from(files["background.js"]).toString("utf8");
assert(background.includes("chrome.action.onClicked") && background.includes("app/app.html"), "the toolbar action does not open the packaged editor");
assert(files["app/app.html"], "the packaged editor entry is missing");
assert(files["app/privacy.html"], "the packaged privacy notice is missing");

const expectedIcons = {
  "icons/icon-16.png": [16, 16],
  "icons/icon-32.png": [32, 32],
  "icons/icon-48.png": [48, 48],
  "icons/icon-128.png": [128, 128],
};
for (const [file, dimensions] of Object.entries(expectedIcons)) {
  assert(files[file], `${file} is missing`);
  assert(JSON.stringify(pngDimensions(files[file])) === JSON.stringify(dimensions), `${file} has the wrong dimensions`);
}

const names = Object.keys(files);
assert(!names.some((file) => file.endsWith(".map")), "source maps must not ship in the store ZIP");
assert(!names.some((file) => /(^|\/)\.env(?:\.|$)/.test(file)), "environment files must not ship in the store ZIP");
assert(!names.some((file) => file.startsWith("glassware-extension/")), "the ZIP must not contain a wrapper directory");
assert(names.every((file) => !file.includes("\\") && !file.startsWith("/")), "ZIP paths must be portable and relative");

for (const [file, bytes] of Object.entries(files)) {
  if (!/\.html$/i.test(file)) continue;
  const html = Buffer.from(bytes).toString("utf8");
  assert(!/<script\b[^>]*\bsrc=["']https?:/i.test(html), `${file} loads a remote script`);
}

const checksum = createHash("sha256").update(archive).digest("hex");
const checksumFile = await readFile(resolve(storeTarget, `${archiveName}.sha256`), "utf8");
assert(checksumFile === `${checksum}  ${archiveName}\n`, "the SHA-256 receipt does not match the ZIP");
assert(archive.byteLength < 5_000_000, "the Chromium package unexpectedly exceeds 5 MB");

console.log(`GlassWare Chromium package verified: ${archiveName}, ${names.length} files, ${(archive.byteLength / 1_000_000).toFixed(2)} MB, SHA-256 ${checksum}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngDimensions(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  assert(signature.every((byte, index) => bytes[index] === byte), "icon is not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}
