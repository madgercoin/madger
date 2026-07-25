import { cp, mkdir, rm } from "node:fs/promises";
import { assetFiles, rootFiles } from "./site-config.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await Promise.all(rootFiles.map(file => cp(file, `dist/${file}`)));
await Promise.all(assetFiles.map(file => cp(file, `dist/assets/${file}`)));
console.log(`Built MADGER static site with ${rootFiles.length + assetFiles.length} files.`);
