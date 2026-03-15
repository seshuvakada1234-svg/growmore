import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API route to update order status and verification details.
 * Primarily used by automated verification services like n8n.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, status, verification_method, retry_attempts } = body;

    if (!order_id || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const orderRef = adminDb.collection('orders').doc(order_id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: any = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (verification_method !== undefined) {
      updateData.verification_method = verification_method;
    }

    if (retry_attempts !== undefined) {
      updateData.retry_attempts = retry_attempts;
    }

    await orderRef.update(updateData);

    return NextResponse.json({ success: true, order_id, status });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}