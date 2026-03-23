import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload-invoice
//
// Body: FormData
//   file    — PDF Blob
//   orderId — string
//   type    — "final" | "proforma" | "cancelled"
//
// Returns: { url: string }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file    = formData.get("file")    as Blob   | null;
    const orderId = formData.get("orderId") as string | null;
    const type    = formData.get("type")    as string | null;

    if (!file || !orderId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, orderId, type" },
        { status: 400 }
      );
    }

    // ── R2 credentials from env ───────────────────────────────────────────────
    const accountId      = process.env.R2_ACCOUNT_ID!;
    const bucketName     = process.env.R2_BUCKET_NAME!;
    const accessKeyId    = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
    const publicUrl      = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev

    if (!accountId || !bucketName || !accessKeyId || !secretAccessKey || !publicUrl) {
      return NextResponse.json({ error: "R2 environment variables not configured" }, { status: 500 });
    }

    // ── Build object key ──────────────────────────────────────────────────────
    // invoices/{type}/{orderId}.pdf
    const objectKey = `invoices/${type}/${orderId}.pdf`;

    // ── Upload to R2 via S3-compatible API (fetch + AWS Sig v4) ───────────────
    const arrayBuffer = await file.arrayBuffer();
    const body        = new Uint8Array(arrayBuffer);

    const uploadUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`;

    // Sign and upload using the AWS Signature V4 helper
    const signedHeaders = await signRequest({
      method:          "PUT",
      url:             uploadUrl,
      body,
      accessKeyId,
      secretAccessKey,
      region:          "auto",
      service:         "s3",
      contentType:     "application/pdf",
    });

    const uploadRes = await fetch(uploadUrl, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/pdf",
        ...signedHeaders,
      },
      body,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[upload-invoice] R2 upload failed:", errText);
      return NextResponse.json({ error: "R2 upload failed", detail: errText }, { status: 500 });
    }

    // ── Return public URL ─────────────────────────────────────────────────────
    const url = `${publicUrl}/${objectKey}`;
    return NextResponse.json({ url });

  } catch (err: any) {
    console.error("[upload-invoice]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal AWS Signature V4 implementation (no SDK dependency)
// ─────────────────────────────────────────────────────────────────────────────
async function signRequest({
  method,
  url,
  body,
  accessKeyId,
  secretAccessKey,
  region,
  service,
  contentType,
}: {
  method:           string;
  url:              string;
  body:             Uint8Array;
  accessKeyId:      string;
  secretAccessKey:  string;
  region:           string;
  service:          string;
  contentType:      string;
}): Promise<Record<string, string>> {
  const parsedUrl  = new URL(url);
  const host       = parsedUrl.host;
  const now        = new Date();
  const amzDate    = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp  = amzDate.slice(0, 8);

  // Hash body
  const bodyHash = await sha256Hex(body);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${bodyHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    parsedUrl.pathname,
    parsedUrl.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  // Derive signing key
  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, service);
  const signature  = await hmacHex(signingKey, stringToSign);

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization:          authHeader,
    "x-amz-date":           amzDate,
    "x-amz-content-sha256": bodyHash,
  };
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacRaw(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const rawKey = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function deriveSigningKey(
  secret:   string,
  date:     string,
  region:   string,
  service:  string
): Promise<ArrayBuffer> {
  const kDate    = await hmacRaw(`AWS4${secret}`, date);
  const kRegion  = await hmacRaw(kDate, region);
  const kService = await hmacRaw(kRegion, service);
  return hmacRaw(kService, "aws4_request");
}