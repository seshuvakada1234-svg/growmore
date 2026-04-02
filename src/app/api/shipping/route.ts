import { NextRequest, NextResponse } from 'next/server';

// ── Token cache ───────────────────────────────────────────────
let cachedToken = '';
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    console.log('[Shiprocket] Using cached token');
    return cachedToken;
  }

  console.log('[Shiprocket] Fetching new token...');

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email:    process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  const raw = await res.json();
  console.log('[Shiprocket] Auth response:', JSON.stringify(raw));

  // ✅ FIX 1: token can be at root or nested inside data{}
  const token = raw?.token || raw?.data?.token;

  if (!res.ok || !token) {
    console.error('[Shiprocket] Auth failed. Response:', raw);
    throw new Error(`Shiprocket auth failed: ${raw?.message || 'No token returned'}`);
  }

  cachedToken = token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  console.log('[Shiprocket] Token cached successfully');
  return cachedToken;
}

// ── GET /api/shipping?pincode=500001 ─────────────────────────
export async function GET(req: NextRequest) {
  try {
    const pincode = req.nextUrl.searchParams.get('pincode');
    const weight  = req.nextUrl.searchParams.get('weight') || '1';
    const cod     = req.nextUrl.searchParams.get('cod')    || '0';

    console.log('[Shipping API] Request params:', { pincode, weight, cod });

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: 'Invalid pincode. Please enter a valid 6-digit pincode.' },
        { status: 400 }
      );
    }

    // ✅ FIX 2: Validate env vars early with clear error
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      console.error('[Shipping API] Missing SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD in .env.local');
      return NextResponse.json(
        { error: 'Server misconfiguration. Contact support.' },
        { status: 500 }
      );
    }

    if (!process.env.PICKUP_POSTCODE) {
      console.error('[Shipping API] Missing PICKUP_POSTCODE in .env.local');
      return NextResponse.json(
        { error: 'Server misconfiguration. Contact support.' },
        { status: 500 }
      );
    }

    const token = await getToken();

    // ✅ FIX 3: Serviceability uses GET with query params, not POST with body
    const params = new URLSearchParams({
      pickup_postcode:   process.env.PICKUP_POSTCODE!,
      delivery_postcode: pincode,
      weight:            weight,
      cod:               cod,
    });

    const serviceUrl = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params}`;
    console.log('[Shiprocket] Calling serviceability:', serviceUrl);

    const res = await fetch(serviceUrl, {
      method:  'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();
    console.log('[Shiprocket] Serviceability raw response:', JSON.stringify(data));

    if (!res.ok) {
      console.error('[Shiprocket] Serviceability failed:', data);
      throw new Error(`Serviceability check failed: ${data?.message || res.status}`);
    }

    // ✅ FIX 4: Safe deep access with fallbacks
    const couriers =
      data?.data?.available_courier_companies ||
      data?.available_courier_companies ||
      [];

    console.log('[Shiprocket] Couriers found:', couriers.length);

    if (couriers.length === 0) {
      return NextResponse.json(
        { error: 'No delivery available at this pincode.' },
        { status: 404 }
      );
    }

    // ✅ FIX 5: Robust field normalization with type safety
    const normalized = couriers.map((c: any) => ({
      name:  c.courier_name  ?? c.name          ?? 'Unknown',
      days:  parseInt(c.estimated_delivery_days ?? c.etd ?? '7', 10),
      price: parseFloat(c.rate ?? c.freight_charge ?? '0'),
    })).filter((c: any) => !isNaN(c.price) && !isNaN(c.days)); // remove bad entries

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: 'No valid courier options found.' },
        { status: 404 }
      );
    }

    const fastest  = [...normalized].sort((a, b) => a.days  - b.days  || a.price - b.price)[0];
    const cheapest = [...normalized].sort((a, b) => a.price - b.price || a.days  - b.days)[0];

    console.log('[Shipping API] Returning:', { fastest, cheapest });

    return NextResponse.json({
      price:   fastest.price,
      days:    fastest.days,
      courier: fastest.name,
      options: { fastest, cheapest },
    });

  } catch (err: any) {
    console.error('[Shipping API] Unhandled error:', err.message);
    return NextResponse.json(
      { error: 'Could not fetch shipping details. Please try again.' },
      { status: 500 }
    );
  }
}