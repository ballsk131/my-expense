/**
 * Copies the Tesseract worker, wasm core and language data out of node_modules
 * into public/tesseract/, so the app serves all of it from its own origin
 * instead of a CDN. Scanning a receipt then works offline and sends nothing to
 * a third party.
 *
 * Everything here is reproducible from package.json, so public/tesseract/ is
 * gitignored. Runs automatically before `npm run dev` and `npm run build`.
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modules = join(root, "node_modules");
const outDir = join(root, "public", "tesseract");

/**
 * tesseract.js picks a core variant at runtime from the browser's wasm
 * support, so every variant it might ask for has to be on disk — but only the
 * LSTM ones, because the app runs the worker with OEM 1 (LSTM only), and only
 * the `.wasm.js` builds, which carry their wasm inline. A device downloads
 * exactly one of these; the rest only have to be reachable.
 */
const CORE_VARIANTS = [
  "tesseract-core-relaxedsimd-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-lstm.wasm.js",
];

/** `4.0.0_best_int` is the integer-quantised model the LSTM-only core wants. */
const LANGS = ["tha", "eng"];

const copies = [
  [join(modules, "tesseract.js", "dist", "worker.min.js"), join(outDir, "worker.min.js")],
  ...CORE_VARIANTS.map((file) => [
    join(modules, "tesseract.js-core", file),
    join(outDir, "core", file),
  ]),
  ...LANGS.map((lang) => [
    join(modules, "@tesseract.js-data", lang, "4.0.0_best_int", `${lang}.traineddata.gz`),
    join(outDir, "lang", `${lang}.traineddata.gz`),
  ]),
];

let bytes = 0;
for (const [from, to] of copies) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  bytes += statSync(to).size;
}

console.log(
  `ocr assets: ${copies.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB) -> public/tesseract/`,
);
