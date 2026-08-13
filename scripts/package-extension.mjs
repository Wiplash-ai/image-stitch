import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "artifacts/glassware-extension");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(root, "extension"), target, { recursive: true });
await cp(resolve(root, "dist"), resolve(target, "app"), { recursive: true });

const manifestPath = resolve(target, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.version = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")).version;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Packaged MV3 extension at ${target}`);
