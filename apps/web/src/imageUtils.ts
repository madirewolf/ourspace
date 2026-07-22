/**
 * Read an image file and return a downscaled JPEG data URL. Everything is
 * localStorage-bound in the local-first v0, so the *encoded size* is the
 * budget that matters: step dimensions and quality down until the result
 * fits. Throws if the browser cannot decode the file (e.g. HEIC) — callers
 * handle that per file.
 */
export async function fileToDataUrl(
  file: File,
  maxEdge = 1200,
  maxBytes = 200_000,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  // Data URLs are base64: ~4/3 of the byte size.
  const maxLength = Math.floor(maxBytes * 1.37);
  const attempts: [number, number][] = [
    [maxEdge, 0.85],
    [maxEdge, 0.7],
    [maxEdge * 0.75, 0.65],
    [maxEdge * 0.55, 0.6],
    [maxEdge * 0.4, 0.55],
  ];

  let best = "";
  for (const [edge, quality] of attempts) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("no 2d context");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    best = canvas.toDataURL("image/jpeg", quality);
    if (best.length <= maxLength) {
      break;
    }
  }
  bitmap.close();
  return best;
}
