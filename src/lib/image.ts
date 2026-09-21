/** Longest edge, in px, that a receipt photo is scaled to before OCR. */
const OCR_MAX_EDGE = 1600;
/** Smaller cap for the copy we keep, so a year of receipts fits in IndexedDB. */
const STORED_MAX_EDGE = 1000;

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  // `imageOrientation` applies the EXIF rotation phones write, so a photo taken
  // sideways is uprighted before OCR ever sees it.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

async function resize(file: Blob, maxEdge: number, quality: number): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ?? file;
}

/** A downscaled, uprighted copy for the OCR pass. */
export function prepareForOcr(file: Blob): Promise<Blob> {
  return resize(file, OCR_MAX_EDGE, 0.92);
}

/** A smaller copy to keep alongside the expense. */
export function prepareForStorage(file: Blob): Promise<Blob> {
  return resize(file, STORED_MAX_EDGE, 0.8);
}
