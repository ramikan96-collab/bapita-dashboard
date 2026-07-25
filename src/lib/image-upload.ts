/**
 * Client-side guard rails for anything headed to the `business-images` bucket.
 *
 * Two jobs, both about images that reach visitors intact:
 *
 * 1. HEIC/HEIF (the iPhone default) is undecodable by most browsers *and* by
 *    Vercel's image optimizer, so it renders as a broken image on booking pages
 *    and can't be resized. We transcode to JPEG at upload time.
 * 2. A hard size ceiling, so a single camera original can't sit in Storage as a
 *    multi-megabyte source file.
 *
 * Callers are responsible for surfacing the thrown message to the user.
 */

/** Source files above this are rejected outright. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const HEIC_TYPES = ["image/heic", "image/heif"];
const HEIC_EXTENSIONS = [".heic", ".heif"];

export interface PreparedImage {
  /** The file to upload — the original, or a JPEG transcode of it. */
  file: File;
  /** Extension to use in the storage path, without the dot. */
  ext: string;
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    HEIC_TYPES.includes(file.type.toLowerCase()) ||
    HEIC_EXTENSIONS.some((ext) => name.endsWith(ext))
  );
}

function extensionOf(file: File): string {
  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
}

async function transcodeToJpeg(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // Safari (iOS/macOS) decodes HEIC natively here. Chrome and Firefox do not,
    // and throw — which is the case the catch below reports.
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This photo is in Apple's HEIC format, which browsers can't display. " +
        "On iPhone: Settings → Camera → Formats → Most Compatible, then retake or re-export the photo as JPEG."
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this photo. Please try a different one.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    // 0.92 keeps the transcode visually identical to the HEIC source.
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  if (!blob) throw new Error("Could not process this photo. Please try a different one.");

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

/**
 * Validates and, when needed, converts a user-picked image.
 * Throws an `Error` with a user-facing message if the file can't be accepted.
 */
export async function prepareImageUpload(file: File): Promise<PreparedImage> {
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `"${file.name}" is ${mb} MB. Please use a photo under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
    );
  }

  if (isHeic(file)) {
    return { file: await transcodeToJpeg(file), ext: "jpg" };
  }

  return { file, ext: extensionOf(file) };
}
