import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { unzipSync, zipSync } from "fflate";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "artifacts/glassware-extension");
const storeTarget = resolve(root, "artifacts/store/chromium");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const version = packageJson.version;
const archiveName = `glassware-${version}-chromium.zip`;
const archivePath = resolve(storeTarget, archiveName);
const fixedArchiveDate = new Date("2020-01-01T00:00:00.000Z");

await rm(target, { recursive: true, force: true });
await rm(storeTarget, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await mkdir(storeTarget, { recursive: true });
await cp(resolve(root, "extension"), target, { recursive: true });
await cp(resolve(root, "dist"), resolve(target, "app"), {
  recursive: true,
  filter: (source) => !source.endsWith(".map"),
});

const manifestPath = resolve(target, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.version = version;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const files = await collectFiles(target);
const zippable = {};
for (const file of files) {
  const source = resolve(target, ...file.split("/"));
  let bytes = new Uint8Array(await readFile(source));
  if (/\.(?:css|js)$/i.test(file)) {
    const cleaned = Buffer.from(bytes).toString("utf8")
      .replace(/\n?\/\/# sourceMappingURL=.*$/gm, "")
      .replace(/\n?\/\*# sourceMappingURL=.*?\*\//gm, "");
    bytes = new TextEncoder().encode(cleaned);
    await writeFile(source, bytes);
  }
  zippable[file] = [bytes, { mtime: fixedArchiveDate, os: 3, attrs: 0o644 << 16 }];
}

const archive = zipSync(zippable, { level: 9, mtime: fixedArchiveDate });
await writeFile(archivePath, archive);
const expanded = unzipSync(archive);
if (!expanded["manifest.json"] || Object.keys(expanded).some((file) => file.startsWith("glassware-extension/"))) {
  throw new Error("The Chromium ZIP must contain manifest.json at its root.");
}

const sha256 = createHash("sha256").update(archive).digest("hex");
await writeFile(resolve(storeTarget, `${archiveName}.sha256`), `${sha256}  ${archiveName}\n`);
await writeFile(resolve(storeTarget, "release.json"), `${JSON.stringify({
  schemaVersion: 1,
  product: "GlassWare",
  target: "chromium-mv3",
  version,
  archive: archiveName,
  sha256,
  bytes: archive.byteLength,
  files: files.length,
  permissions: manifest.permissions,
  hostPermissions: manifest.host_permissions,
}, null, 2)}\n`);

console.log(`Packaged MV3 extension at ${target}`);
console.log(`Created Chromium store archive at ${archivePath}`);
console.log(`SHA-256 ${sha256}`);

async function collectFiles(directory) {
  const collected = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) collected.push(relative(directory, path).split(sep).join("/"));
    }
  }
  await walk(directory);
  return collected;
}
