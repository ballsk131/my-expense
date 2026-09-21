/**
 * Re-runs the data-viz colour checks against the category tokens in
 * src/index.css, so the palette is never changed on taste alone.
 *
 *   npm run validate:palette
 *
 * The checks themselves live in validate-palette-checks.mjs (the
 * design-system-agnostic validator). This file supplies the parameters: which
 * tokens make up the categorical palette, and the two chart surfaces.
 *
 * Categories are compared across ALL pairs, not just adjacent ones, because a
 * ranked bar chart re-sorts every month — any two categories can end up side
 * by side.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./validate-palette-checks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "index.css"), "utf8");

const LIGHT_SURFACE = "#ffffff"; // --surface-raised, light
const DARK_SURFACE = "#111c21"; // --surface-raised, dark

function oklchToHex(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    "#" +
    channels
      .map((v) => {
        const enc = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, enc)) * 255)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

const tokens = [...css.matchAll(/--color-cat-([a-z]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)];

if (!tokens.length) {
  console.error("No --color-cat-* tokens found in src/index.css");
  process.exit(1);
}

// Sort by hue so the report's pair names are easy to reason about.
const slots = tokens
  .map(([, name, L, C, h]) => ({ name, hex: oklchToHex(+L, +C, +h), h: +h }))
  .sort((a, b) => a.h - b.h);

console.log("Category tokens:");
for (const slot of slots) console.log(`  ${slot.name.padEnd(10)} ${slot.hex}  (hue ${slot.h})`);

let failed = false;

for (const [mode, surface] of [
  ["light", LIGHT_SURFACE],
  ["dark", DARK_SURFACE],
]) {
  const { report, ok } = validate(
    slots.map((s) => s.hex),
    { mode, surface, pairs: "all" },
  );

  console.log(`\n${mode} (surface ${surface}, all pairs)`);
  // The validator encodes each row's state as one of these; "floor" and
  // "relief" are warnings that stay legal given secondary encoding.
  const GLYPH = { true: "PASS", false: "FAIL", pass: "PASS", floor: "WARN", fail: "FAIL", relief: "WARN" };
  for (const [label, status, detail] of report) {
    console.log(`  [${GLYPH[String(status)] ?? "FAIL"}] ${label.padEnd(22)} ${detail}`);
  }
  if (!ok) failed = true;
}

if (failed) {
  console.error("\nPalette FAILED — fix the marked checks before shipping.");
  process.exit(1);
}

console.log(
  "\nAll checks pass. Note: a CVD dE in the 6-8 band is only legal because every" +
    "\nbar and row also carries an emoji and a text label.",
);
