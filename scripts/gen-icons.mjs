/**
 * Renders the app icon to PNG without a native image toolchain.
 * Shapes are evaluated per-pixel with 3x supersampling for clean edges, then
 * encoded as a plain RGBA PNG through zlib. Run: node scripts/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [15, 107, 115]; // brand-700, matches manifest theme_color
const INK = [255, 255, 255];

/** Signed-distance style test: is (x, y) inside the icon's white receipt? */
function receiptAlpha(x, y, size) {
  // Work in a 0..1 space so the same geometry scales to any icon size.
  const u = x / size;
  const v = y / size;

  const left = 0.3,
    right = 0.7,
    top = 0.22,
    bottom = 0.74;

  if (u < left || u > right || v < top) return 0;

  // Torn bottom edge: four triangular notches.
  if (v > bottom) {
    const teeth = 4;
    const depth = 0.05;
    const phase = ((u - left) / (right - left)) * teeth;
    const saw = Math.abs((phase % 1) - 0.5) * 2; // 0 at tooth centre, 1 at seam
    if (v > bottom + depth * saw) return 0;
  }

  // Two ruled lines, punched back out of the white body.
  for (const lineY of [0.36, 0.46]) {
    if (Math.abs(v - lineY) < 0.018 && u > left + 0.05 && u < right - 0.05) return 0;
  }

  // A short third line, like a total.
  if (Math.abs(v - 0.56) < 0.018 && u > left + 0.05 && u < right - 0.14) return 0;

  return 1;
}

function roundedSquareAlpha(x, y, size) {
  const r = size * 0.22;
  const dx = Math.max(r - x, 0, x - (size - r));
  const dy = Math.max(r - y, 0, y - (size - r));
  return Math.hypot(dx, dy) <= r ? 1 : 0;
}

function render(size) {
  const ss = 3; // supersampling factor
  const px = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0;
      let ink = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const fx = x + (sx + 0.5) / ss;
          const fy = y + (sy + 0.5) / ss;
          const inSquare = roundedSquareAlpha(fx, fy, size);
          bg += inSquare;
          ink += inSquare && receiptAlpha(fx, fy, size) ? 1 : 0;
        }
      }

      const samples = ss * ss;
      const alpha = bg / samples;
      const inkRatio = ink / samples;

      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        px[i + c] = Math.round(BG[c] * (1 - inkRatio) + INK[c] * inkRatio);
      }
      px[i + 3] = Math.round(alpha * 255);
    }
  }

  return px;
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 10-12: compression, filter, interlace — all 0

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, encodePng(render(size), size));
  console.log(`public/icon-${size}.png`);
}
