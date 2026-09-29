import sharp from "sharp";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export async function prepareAvatar(input: Uint8Array) {
  if (!input.byteLength || input.byteLength > MAX_AVATAR_BYTES)
    throw new Error("Choose an image smaller than 2 MB.");
  const options = { limitInputPixels: 16000000, failOn: "error" as const };
  const metadata = await sharp(input, options).metadata();
  if (
    !metadata.format ||
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Choose a still JPEG, PNG, or WebP image.");
  // Sharp discards EXIF/XMP by default. Rotate first so EXIF orientation is preserved visually.
  return sharp(input, options)
    .rotate()
    .resize(512, 512, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
