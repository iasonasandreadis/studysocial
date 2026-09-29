import sharp from "sharp";
import { createHash } from "node:crypto";
const MAX_BYTES = 3 * 1024 * 1024;
export async function preparePostImage(input: Uint8Array) {
  if (!input.byteLength || input.byteLength > MAX_BYTES)
    throw new Error("Choose an image up to 3 MB.");
  const options = { limitInputPixels: 40000000, failOn: "error" as const };
  const metadata = await sharp(input, options).metadata();
  if (
    !metadata.format ||
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Choose a still JPEG, PNG or WebP image.");
  const bytes = await sharp(input, options)
    .rotate()
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  if (bytes.byteLength > MAX_BYTES) throw new Error("Try a smaller image.");
  return { bytes, hash: createHash("sha256").update(bytes).digest("hex") };
}
