import { createWorker, type Worker } from "tesseract.js";
import { prepareForOcr } from "./image";

export type OcrStage = "loading" | "recognising";

export interface OcrProgress {
  stage: OcrStage;
  /** 0–1 within the current stage. */
  value: number;
}

/**
 * The worker, wasm core and language data are all served from this app's own
 * origin — scripts/sync-ocr-assets.mjs copies them out of node_modules at
 * build time. Nothing reaches a CDN, so scanning works offline and no third
 * party sees a request when someone photographs a receipt.
 *
 * Resolved against the document's base URL rather than hardcoded to the root,
 * so the app also works when it is served from a subdirectory (project pages,
 * a preview deploy). Tesseract hands `corePath` to `importScripts` inside the
 * worker, where a relative path would resolve against the worker's own URL —
 * hence full absolute URLs here.
 */
const asset = (path: string) => new URL(path, document.baseURI).href;

const WORKER_PATH = asset("tesseract/worker.min.js");
const CORE_PATH = asset("tesseract/core");
const LANG_PATH = asset("tesseract/lang");

const LANGS = ["tha", "eng"] as const;

/**
 * Some static hosts serve only a fixed set of file types and will not hand out
 * the `.traineddata.gz` files, which leaves OCR unable to start. Building with
 * VITE_OCR_INLINE_LANG=1 also emits the same bytes as a .js module
 * (scripts/inline-ocr-lang.mjs) and seeds them into the engine's own cache.
 */
const INLINE_LANG = import.meta.env.VITE_OCR_INLINE_LANG === "1";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Writes the inlined language data straight into the idb-keyval store that
 * tesseract reads before it fetches anything, under the keys it looks for
 * (`./<lang>.traineddata`). It sniffs the gzip magic bytes and inflates them
 * itself, so these go in exactly as generated.
 *
 * This seeds the cache rather than passing `{ code, data }` objects to
 * createWorker, which would be the obvious route: tesseract.js 7 builds the
 * language string for its initialise step with `l.data` instead of `l.code`
 * (worker-script/index.js), so the object form makes it look for a language
 * named after the raw bytes and fail. Strings avoid that path entirely.
 */
async function primeLangCache(): Promise<void> {
  const [{ get, set }, { LANGDATA }] = await Promise.all([
    import("idb-keyval"),
    import(/* @vite-ignore */ asset("tesseract/lang/langdata.js")) as Promise<{
      LANGDATA: Record<string, string>;
    }>,
  ]);

  await Promise.all(
    LANGS.map(async (code) => {
      const key = `./${code}.traineddata`;
      // A previous visit already seeded it, or tesseract cached it itself.
      if ((await get(key)) !== undefined) return;
      await set(key, base64ToBytes(LANGDATA[code]));
    }),
  );
}

/**
 * Tesseract can wedge instead of rejecting when initialisation fails — a
 * missing core or corrupt language file leaves the load promise pending. These
 * caps mean a stuck engine turns into manual entry rather than a spinner that
 * never ends.
 */
const LOAD_TIMEOUT_MS = 90_000;
const RECOGNISE_TIMEOUT_MS = 120_000;

let workerPromise: Promise<Worker> | null = null;

export class OcrUnavailableError extends Error {
  constructor(cause: unknown) {
    super("ไม่สามารถเริ่มระบบอ่านใบเสร็จได้");
    this.name = "OcrUnavailableError";
    this.cause = cause;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * One worker, reused for the life of the tab: loading the language data costs
 * a few MB, so paying that once matters on a phone.
 */
function getWorker(onProgress?: (p: OcrProgress) => void): Promise<Worker> {
  workerPromise ??= withTimeout(
    // OEM 1 is the LSTM engine — better on the low-contrast thermal print
    // receipts are usually on, and the only core variant shipped.
    (INLINE_LANG ? primeLangCache() : Promise.resolve()).then(() =>
      createWorker([...LANGS], 1, {
        workerPath: WORKER_PATH,
        corePath: CORE_PATH,
        langPath: LANG_PATH,
      // Without this, a failure inside the worker surfaces as an unhandled
      // error on window rather than rejecting the promise we are awaiting.
        errorHandler: (err) => {
          throw err instanceof Error ? err : new Error(String(err));
        },
        logger: (m) => {
          if (!onProgress) return;
          if (m.status === "recognizing text") {
            onProgress({ stage: "recognising", value: m.progress });
          } else {
            onProgress({ stage: "loading", value: m.progress });
          }
        },
      }),
    ),
    LOAD_TIMEOUT_MS,
    "OCR startup",
  ).catch((err) => {
    // Let the next attempt rebuild the worker rather than reusing a rejection.
    workerPromise = null;
    throw err;
  });

  return workerPromise;
}

export async function readReceiptText(
  file: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  let worker: Worker;
  try {
    worker = await getWorker(onProgress);
  } catch (err) {
    // A browser without the required wasm support, a missing asset, or a
    // wedged engine — callers fall back to manual entry, keeping the photo.
    throw new OcrUnavailableError(err);
  }

  const prepared = await prepareForOcr(file);

  try {
    const { data } = await withTimeout(
      worker.recognize(prepared),
      RECOGNISE_TIMEOUT_MS,
      "OCR",
    );
    return data.text;
  } catch (err) {
    // A worker that timed out mid-page is not reliably reusable.
    void releaseOcr();
    throw err;
  }
}

/** Frees the worker's memory — worth doing when the app goes to the background. */
export async function releaseOcr() {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // Nothing to release; the worker never came up.
  }
}
