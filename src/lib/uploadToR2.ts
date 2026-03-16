import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const IMAGEKIT_ID = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.replace(
  "https://ik.imagekit.io/",
  ""
);

/**
 * Upload a file buffer to Cloudflare R2
 * Returns an ImageKit URL (not R2 URL — ImageKit serves it via CDN)
 *
 * @param file     - File buffer
 * @param fileName - Original file name
 * @param folder   - "hero" | "products" | "categories"
 * @param contentType - MIME type e.g. "image/jpeg"
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  folder: string,
  contentType: string
): Promise<string> {
  // Sanitize filename — remove spaces and special chars
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}_${safeName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  // Return ImageKit URL — ImageKit fetches from R2 as origin
  return `https://ik.imagekit.io/${IMAGEKIT_ID}/${key}`;
}

/**
 * Delete a file from R2 by its ImageKit URL
 */
export async function deleteFromR2(imagekitUrl: string): Promise<void> {
  try {
    // Extract the key from the ImageKit URL
    // URL format: https://ik.imagekit.io/<id>/<folder>/<filename>
    const url = new URL(imagekitUrl);
    const pathParts = url.pathname.split("/");
    // Remove first two segments: "" and imagekit_id
    const key = pathParts.slice(2).join("/");

    if (!key) return;

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch (err) {
    console.error("R2 delete error:", err);
  }
}