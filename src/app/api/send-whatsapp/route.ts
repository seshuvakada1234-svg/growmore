import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      orderId,
      customerName,
      customerPhone,
      items,
      total,
      paymentMethod,
      status,
    } = await req.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g., whatsapp:+14155238886
    const adminWhatsapp = process.env.ADMIN_WHATSAPP!; // e.g., whatsapp:+919666270282

    const customerWhatsapp = `whatsapp:+91${customerPhone}`;

    const itemsList = items
      .map((i: any) => `• ${i.name} x${i.qty} — ₹${(i.price * i.qty).toLocaleString('en-IN')}`)
      .join('\n');

    const customerMessage = `✅ *Order Confirmed — Monterra* 🌿

Hi ${customerName}! Your order has been placed successfully.

*Order ID:* ${orderId}
*Payment:* ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
*Status:* ${status}

*Items:*
${itemsList}

*Total: ₹${total.toLocaleString('en-IN')}*

We'll notify you once your order is shipped. Thank you for shopping with Monterra! 🌱`;

    const adminMessage = `🛒 *New Order Received — Monterra*

*Order ID:* ${orderId}
*Customer:* ${customerName}
*Phone:* +91${customerPhone}
*Payment:* ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
*Status:* ${status}

*Items:*
${itemsList}

*Total: ₹${total.toLocaleString('en-IN')}*`;

    const sendWhatsApp = async (to: string, body: string) => {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', from);
      params.append('Body', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      return response.json();
    };

    // Send to customer
    const customerResult = await sendWhatsApp(customerWhatsapp, customerMessage);

    // Send to admin
    const adminResult = await sendWhatsApp(adminWhatsapp, adminMessage);

    return NextResponse.json({
      success: true,
      customer: customerResult,
      admin: adminResult,
    });

  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
