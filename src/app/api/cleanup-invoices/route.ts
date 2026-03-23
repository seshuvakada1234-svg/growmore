import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cleanup-invoices
//
// Called by a cron job (e.g. Vercel Cron, Cloudflare Workers Cron).
// Deletes cancelled invoices older than 15 days from R2 and removes the
// cancelledInvoiceUrl field from Firestore.
//
// Protect with CRON_SECRET env var — pass as ?secret=xxx or x-cron-secret header.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const incoming =
      req.nextUrl.searchParams.get("secret") ||
      req.headers.get("x-cron-secret");
    if (incoming !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { app } = await import("@/lib/firebase");
    const db = getFirestore(app);

    // ── Find cancelled orders with invoice URLs older than 15 days ───────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    const cutoffTs = Timestamp.fromDate(cutoff);

    const q = query(
      collection(db, "orders"),
      where("status", "==", "Cancelled"),
      where("cancelledAt", "<=", cutoffTs)
    );

    const snap = await getDocs(q);
    const toClean = snap.docs.filter((d) => !!d.data().cancelledInvoiceUrl);

    if (toClean.length === 0) {
      return NextResponse.json({ cleaned: 0, message: "Nothing to clean" });
    }

    // ── R2 credentials ────────────────────────────────────────────────────────
    const accountId       = process.env.R2_ACCOUNT_ID!;
    const bucketName      = process.env.R2_BUCKET_NAME!;
    const accessKeyId     = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

    const results: { orderId: string; success: boolean; error?: string }[] = [];

    for (const docSnap of toClean) {
      const orderId   = docSnap.id;
      const objectKey = `invoices/cancelled/${orderId}.pdf`;
      const deleteUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`;

      try {
        // ── Delete from R2 ────────────────────────────────────────────────────
        const signedHeaders = await signRequest({
          method:           "DELETE",
          url:              deleteUrl,
          body:             new Uint8Array(0),
          accessKeyId,
          secretAccessKey,
          region:           "auto",
          service:          "s3",
          contentType:      "",
        });

        const delRes = await fetch(deleteUrl, {
          method:  "DELETE",
          headers: signedHeaders,
        });

        // R2 DELETE returns 204 on success or 404 if already gone — both fine
        if (!delRes.ok && delRes.status !== 404) {
          throw new Error(`R2 DELETE returned ${delRes.status}`);
        }

        // ── Remove field from Firestore ────────────────────────────────────
        await updateDoc(doc(db, "orders", orderId), {
          cancelledInvoiceUrl: deleteField(),
        });

        results.push({ orderId, success: true });
      } catch (err: any) {
        console.error(`[cleanup-invoices] ${orderId}`, err);
        results.push({ orderId, success: false, error: err.message });
      }
    }

    const cleaned = results.filter((r) => r.success).length;
    return NextResponse.json({ cleaned, total: toClean.length, results });

  } catch (err: any) {
    console.error("[cleanup-invoices]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal AWS Signature V4 (no SDK needed)
// ─────────────────────────────────────────────────────────────────────────────
async function signRequest({
  method, url, body, accessKeyId, secretAccessKey, region, service, contentType,
}: {
  method: string; url: string; body: Uint8Array;
  accessKeyId: string; secretAccessKey: string;
  region: string; service: string; contentType: string;
}): Promise<Record<string, string>> {
  const parsedUrl = new URL(url);
  const host      = parsedUrl.host;
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const bodyHash  = await sha256Hex(body);
  const hasCT     = contentType.length > 0;

  const canonicalHeaders =
    (hasCT ? `content-type:${contentType}\n` : "") +
    `host:${host}\n` +
    `x-amz-content-sha256:${bodyHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeadersList = (hasCT ? "content-type;" : "") + "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method, parsedUrl.pathname, parsedUrl.searchParams.toString(),
    canonicalHeaders, signedHeadersList, bodyHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign    = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, service);
  const signature  = await hmacHex(signingKey, stringToSign);

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Authorization:          authHeader,
    "x-amz-date":           amzDate,
    "x-amz-content-sha256": bodyHash,
  };
  if (hasCT) headers["Content-Type"] = contentType;
  return headers;
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buf  = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const k   = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacRaw(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const raw = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const k   = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
}

async function deriveSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate    = await hmacRaw(`AWS4${secret}`, date);
  const kRegion  = await hmacRaw(kDate, region);
  const kService = await hmacRaw(kRegion, service);
  return hmacRaw(kService, "aws4_request");
}