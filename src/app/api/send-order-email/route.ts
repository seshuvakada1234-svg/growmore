import { NextResponse } from 'next/server';

const STORE_URL = 'https://growmore-blue.vercel.app';

function customerEmailHtml(order: any) {
  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0">
        <strong>${item.name}</strong><br/>
        <span style="color:#666;font-size:12px">Qty: ${item.qty}</span>
      </td>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;color:#1B5E20">
        ₹${(item.price * item.qty).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const waLink = `https://wa.me/${order.adminWhatsapp}?text=${encodeURIComponent(
    `Hi Monterra! I just placed an order #${order.orderId} for ₹${order.total.toLocaleString('en-IN')}. Please confirm my order.`
  )}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:30px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px">🌿 Monterra</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Premium Plants & Affiliate Marketplace</p>
    </div>

    <!-- Order confirmed banner -->
    <div style="background:#E8F5E9;padding:20px;text-align:center;border-bottom:2px solid #C8E6C9">
      <div style="font-size:40px">✅</div>
      <h2 style="color:#1B5E20;margin:8px 0 4px">Order Confirmed!</h2>
      <p style="color:#2E7D32;margin:0;font-size:14px">Order ID: <strong>${order.orderId}</strong></p>
    </div>

    <!-- Body -->
    <div style="padding:24px">
      <p style="color:#333;font-size:15px">Hi <strong>${order.customerName}</strong> 👋</p>
      <p style="color:#555;font-size:14px">Thank you for your order! We're preparing your plants with care and will dispatch them soon.</p>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead>
          <tr style="background:#F1F8E9">
            <th style="padding:10px;text-align:left;color:#1B5E20;font-size:13px">Item</th>
            <th style="padding:10px;text-align:right;color:#1B5E20;font-size:13px">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td style="padding:10px;font-weight:bold;font-size:15px">Total</td>
            <td style="padding:10px;text-align:right;font-weight:bold;font-size:18px;color:#1B5E20">₹${order.total.toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Shipping info -->
      <div style="background:#F9FBF9;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #E0EEE0">
        <h3 style="color:#1B5E20;margin:0 0 10px;font-size:14px">📦 Shipping To</h3>
        <p style="margin:0;color:#555;font-size:13px;line-height:1.6">
          ${order.shippingAddress.fullAddress}<br/>
          ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
        </p>
      </div>

      <!-- Payment method -->
      <div style="background:#F9FBF9;border-radius:12px;padding:12px 16px;margin:10px 0;border:1px solid #E0EEE0">
        <p style="margin:0;color:#555;font-size:13px">
          💳 <strong>Payment:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod.toUpperCase()}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          📋 <strong>Status:</strong> ${order.status}
        </p>
      </div>

      <!-- WhatsApp button -->
      <div style="text-align:center;margin:24px 0">
        <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:bold;font-size:14px">
          💬 Chat with us on WhatsApp
        </a>
      </div>

      <p style="color:#888;font-size:12px;text-align:center">
        Questions? Reply to this email or visit <a href="${STORE_URL}" style="color:#1B5E20">${STORE_URL}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F1F8E9;padding:16px;text-align:center;border-top:1px solid #E0EEE0">
      <p style="margin:0;color:#2E7D32;font-size:12px">🌱 100% Live Plant Guarantee &nbsp;|&nbsp; 🚚 Free Delivery above ₹1500 &nbsp;|&nbsp; ⭐ 4.8 Rated</p>
      <p style="margin:6px 0 0;color:#aaa;font-size:11px">© 2026 Monterra. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function adminEmailHtml(order: any) {
  const itemsText = order.items.map((i: any) => `• ${i.name} x${i.qty} = ₹${(i.price * i.qty).toLocaleString('en-IN')}`).join('\n');
  const waLink = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${order.customerName}! Your Monterra order #${order.orderId} has been confirmed. We'll dispatch your plants soon! 🌿`
  )}`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#1B5E20;padding:20px;text-align:center">
      <h2 style="color:#fff;margin:0">🛒 New Order Alert!</h2>
    </div>
    <div style="padding:20px">
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Customer:</strong> ${order.customerName}</p>
      <p><strong>Phone:</strong> ${order.customerPhone}</p>
      <p><strong>Email:</strong> ${order.customerEmail}</p>
      <p><strong>Total:</strong> ₹${order.total.toLocaleString('en-IN')}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod.toUpperCase()}</p>
      <p><strong>Address:</strong> ${order.shippingAddress.fullAddress}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
      <hr/>
      <pre style="background:#f9f9f9;padding:12px;border-radius:8px;font-size:13px">${itemsText}</pre>
      <div style="text-align:center;margin-top:20px">
        <a href="${waLink}" style="background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-weight:bold;font-size:14px">
          💬 Reply to Customer on WhatsApp
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId, customerName, customerEmail, customerPhone,
      items, total, paymentMethod, status, shippingAddress
    } = body;

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'seshuvakada1234@gmail.com';
    const adminWhatsapp = process.env.ADMIN_WHATSAPP || '919666270282';

    if (!apiKey) {
      console.error('Missing RESEND_API_KEY');
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    const orderData = {
      orderId, customerName, customerEmail, customerPhone,
      items, total, paymentMethod, status, shippingAddress, adminWhatsapp
    };

    // Send both emails in parallel
    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: 'Monterra Plants <onboarding@resend.dev>',
          to: customerEmail,
          subject: `✅ Order Confirmed #${orderId} — Monterra`,
          html: customerEmailHtml(orderData)
        })
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: 'Monterra Orders <onboarding@resend.dev>',
          to: adminEmail,
          subject: `🛒 New Order #${orderId} — ₹${total.toLocaleString('en-IN')}`,
          html: adminEmailHtml(orderData)
        })
      })
    ]);

    // ── Send WhatsApp notifications via Twilio ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${appUrl}/api/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId, customerName, customerPhone,
        items, total, paymentMethod, status,
      }),
    });

    // Build WhatsApp links to return to frontend
    const customerWaLink = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(
      `Hi Monterra! I placed order #${orderId} for ₹${total.toLocaleString('en-IN')}. Please confirm.`
    )}`;

    const adminWaLink = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `Hi ${customerName}! Your Monterra order #${orderId} is confirmed. We'll dispatch your plants soon! 🌿`
    )}`;

    return NextResponse.json({
      success: true,
      customerWaLink,
      adminWaLink
    });

  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}