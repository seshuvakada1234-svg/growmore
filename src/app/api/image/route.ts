import { NextRequest, NextResponse } from "next/server";

/**
 * Image proxy — hides ImageKit URLs from the browser.
 * Usage: /api/image?file=products/monstera.jpg&w=800&q=80
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const file = searchParams.get("file");
  const w = searchParams.get("w") || "800";
  const h = searchParams.get("h") || "";
  const q = searchParams.get("q") || "80";
  const f = searchParams.get("f") || "webp";

  if (!file) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  const ikEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!ikEndpoint) {
    return NextResponse.json({ error: "ImageKit not configured" }, { status: 500 });
  }

  // Build transformation string
  const transforms = [`w-${w}`, `f-${f}`, `q-${q}`];
  if (h) transforms.push(`h-${h}`);
  const tr = transforms.join(",");

  const imagekitUrl = `${ikEndpoint}/${file}?tr=${tr}`;

  try {
    const response = await fetch(imagekitUrl, { next: { revalidate: 86400 } }); // cache 24h

    if (!response.ok) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/webp";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // cache 1 year
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Image proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}