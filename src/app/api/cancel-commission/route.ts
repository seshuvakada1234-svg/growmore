import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue, Transaction } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestBody {
  orderId: string;
  reason?: string;
  paymentMethod?: string;
  razorpayPaymentId?: string;
  idempotencyKey?: string;
}

interface CommissionDoc {
  status: string;
  orderId: string;
  affiliateId?: string;
  commissionAmount?: number;
  originalCommissionAmount?: number;
}

interface CancelResult {
  commissionDocId: string;
  affiliateId: string | undefined;
  amountDeducted: number;
  skipped: boolean;
  skipReason?: string;
}

// ─── Timeout Utility ──────────────────────────────────────────────────────────

class AbortError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`[withTimeout] "${label}" exceeded ${timeoutMs}ms deadline`);
    this.name = 'AbortError';
  }
}

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AbortError(label, timeoutMs)), timeoutMs);
  });
  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// ─── Logger ───────────────────────────────────────────────────────────────────

interface LogContext {
  requestId: string;
  orderId?: string;
  callerUid?: string;
}

function createLogger(ctx: LogContext) {
  const base = { requestId: ctx.requestId, orderId: ctx.orderId, callerUid: ctx.callerUid };
  return {
    info: (msg: string, meta: Record<string, unknown> = {}) =>
      console.log(JSON.stringify({ level: 'INFO', msg, ts: new Date().toISOString(), ...base, ...meta })),
    warn: (msg: string, meta: Record<string, unknown> = {}) =>
      console.warn(JSON.stringify({ level: 'WARN', msg, ts: new Date().toISOString(), ...base, ...meta })),
    error: (msg: string, meta: Record<string, unknown> = {}) =>
      console.error(JSON.stringify({ level: 'ERROR', msg, ts: new Date().toISOString(), ...base, ...meta })),
  };
}

const bareLog = {
  info: (msg: string, meta: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ level: 'INFO', msg, ts: new Date().toISOString(), ...meta })),
  warn: (msg: string, meta: Record<string, unknown> = {}) =>
    console.warn(JSON.stringify({ level: 'WARN', msg, ts: new Date().toISOString(), ...meta })),
  error: (msg: string, meta: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ level: 'ERROR', msg, ts: new Date().toISOString(), ...meta })),
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_REASONS = [
  'order_cancelled',
  'Ordered by mistake',
  'Found cheaper elsewhere',
  'Changed my mind',
  'Delivery time too long',
  'Other',
] as const;

const VALID_REASONS_SET = new Set<string>(VALID_REASONS);
type ValidReason = (typeof VALID_REASONS)[number];

const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_STUCK_THRESHOLD_MS = 10_000;
const MAX_REASON_LENGTH = 500;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

const TIMEOUT_AUTH_MS = 3_000;
const TIMEOUT_RATE_LIMIT_MS = 2_000;
const TIMEOUT_ORDER_RESOLVE_MS = 4_000;
const TIMEOUT_IDEMPOTENCY_MS = 3_000;
const TIMEOUT_COMMISSIONS_MS = 4_000;
const TIMEOUT_TRANSACTION_MS = 8_000;
const TIMEOUT_COMMISSION_SYNC_MS = 3_000;
const TIMEOUT_ORDER_UPDATE_MS = 5_000;

const RATE_LIMIT_WINDOW_MS = 2_000;
const RATE_LIMIT_JITTER_MS = 200;

// ─── Amount Safety Helper ─────────────────────────────────────────────────────

function parseSafeAmount(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'string' && raw.trim() === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  return n;
}

// ─── Error Categorization ─────────────────────────────────────────────────────

function categorizeError(error: unknown): { status: 503 | 500; label: string } {
  if (error instanceof AbortError) return { status: 503, label: 'timeout' };
  return { status: 500, label: error instanceof Error ? error.message : 'unknown' };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateBody(raw: unknown): { data: RequestBody } | { error: string; status: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'Request body must be a JSON object', status: 400 };
  }

  const body = raw as Record<string, unknown>;

  if (!body.orderId || typeof body.orderId !== 'string' || !body.orderId.trim()) {
    return { error: 'orderId is required and must be a non-empty string', status: 400 };
  }
  if (body.orderId.length > 128) {
    return { error: 'orderId is too long', status: 400 };
  }

  let resolvedReason: ValidReason = 'order_cancelled';
  if (body.reason !== undefined) {
    if (typeof body.reason !== 'string') return { error: 'reason must be a string', status: 400 };
    if (body.reason.length > MAX_REASON_LENGTH) {
      return { error: `reason must be ${MAX_REASON_LENGTH} characters or fewer`, status: 400 };
    }
    const trimmed = body.reason.trim();
    if (!VALID_REASONS_SET.has(trimmed)) {
      return { error: `reason must be one of: ${VALID_REASONS.join(', ')}`, status: 400 };
    }
    resolvedReason = trimmed as ValidReason;
  }

  if (body.idempotencyKey !== undefined) {
    if (typeof body.idempotencyKey !== 'string') {
      return { error: 'idempotencyKey must be a string', status: 400 };
    }
    if (body.idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      return { error: `idempotencyKey must be ${MAX_IDEMPOTENCY_KEY_LENGTH} characters or fewer`, status: 400 };
    }
  }

  const paymentMethod =
    typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() : undefined;
  const razorpayPaymentId =
    typeof body.razorpayPaymentId === 'string' ? body.razorpayPaymentId.trim() : undefined;

  return {
    data: {
      orderId: body.orderId.trim(),
      reason: resolvedReason,
      paymentMethod,
      razorpayPaymentId,
      idempotencyKey:
        typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : undefined,
    },
  };
}

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function resolveCallerUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token || token.length > 4096) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

async function checkRateLimit(
  callerUid: string,
  log: ReturnType<typeof createLogger>
): Promise<boolean> {
  const rateLimitRef = adminDb.collection('_rate_limits').doc(`cancel-commission:${callerUid}`);
  const now = Date.now();
  const snap = await rateLimitRef.get();
  if (snap.exists) {
    const lastRequestAt: number = snap.data()?.lastRequestAt ?? 0;
    const elapsed = now - lastRequestAt;
    const effectiveWindow = RATE_LIMIT_WINDOW_MS - RATE_LIMIT_JITTER_MS;
    if (elapsed < effectiveWindow) {
      log.warn('Rate limit exceeded', { elapsed, effectiveWindowMs: effectiveWindow });
      return false;
    }
  }
  await rateLimitRef.set({ lastRequestAt: now, callerUid }, { merge: true });
  return true;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

type IdempotencyCheckResult =
  | { outcome: 'cached'; response: Record<string, unknown> }
  | { outcome: 'in_flight' }
  | { outcome: 'proceed' };

async function checkAndReserveIdempotencyKey(
  key: string,
  callerUid: string,
  log: ReturnType<typeof createLogger>
): Promise<IdempotencyCheckResult> {
  const keyRef = adminDb
    .collection('_idempotency_keys')
    .doc(`cancel-commission:${callerUid}:${key}`);
  const snap = await keyRef.get();

  if (snap.exists) {
    const data = snap.data()!;
    const createdAt: number = data.createdAt ?? 0;
    const status: string = data.status ?? 'processing';
    const age = Date.now() - createdAt;

    if (status === 'complete') {
      if (age < IDEMPOTENCY_KEY_TTL_MS) {
        log.info('Idempotency key hit — returning cached response', { key });
        return { outcome: 'cached', response: data.response as Record<string, unknown> };
      }
      log.info('Idempotency key expired — reprocessing', { key, ageMs: age });
    } else if (status === 'processing') {
      if (age < IDEMPOTENCY_STUCK_THRESHOLD_MS) {
        log.warn('Idempotency key in-flight — rejecting duplicate', { key, ageMs: age });
        return { outcome: 'in_flight' };
      }
      log.warn('Idempotency key stuck — allowing retry', { key, ageMs: age });
    }
  }

  await keyRef.set({ callerUid, createdAt: Date.now(), status: 'processing', response: null });
  return { outcome: 'proceed' };
}

async function writeIdempotencyResult(
  key: string,
  callerUid: string,
  response: Record<string, unknown>,
  log: ReturnType<typeof createLogger>
): Promise<void> {
  const keyRef = adminDb
    .collection('_idempotency_keys')
    .doc(`cancel-commission:${callerUid}:${key}`);
  try {
    await keyRef.set({ status: 'complete', response, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    log.warn('Failed to write idempotency result', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Order Resolution ─────────────────────────────────────────────────────────

async function resolveOrderByBusinessId(orderId: string) {
  const byFieldSnap = await adminDb
    .collection('orders')
    .where('orderId', '==', orderId)
    .limit(1)
    .get();

  if (!byFieldSnap.empty) {
    return { docId: byFieldSnap.docs[0].id, data: byFieldSnap.docs[0].data() };
  }

  const byDocIdSnap = await adminDb.collection('orders').doc(orderId).get();
  if (byDocIdSnap.exists) {
    return { docId: byDocIdSnap.id, data: byDocIdSnap.data()! };
  }

  return null;
}

// ─── Update Order Status to Cancelled ────────────────────────────────────────

async function updateOrderStatusToCancelled(
  orderDocId: string,
  reason: string,
  paymentMethod: string | undefined,
  razorpayPaymentId: string | undefined,
  callerUid: string,
  log: ReturnType<typeof createLogger>
): Promise<void> {
  await withTimeout(
    () =>
      adminDb
        .collection('orders')
        .doc(orderDocId)
        .update({
          status: 'Cancelled',
          cancelReason: reason,
          cancelledAt: FieldValue.serverTimestamp(),
          cancelledBy: callerUid,
          updatedAt: FieldValue.serverTimestamp(),
          ...(paymentMethod && { paymentMethod }),
          ...(razorpayPaymentId && { razorpayPaymentId }),
        }),
    TIMEOUT_ORDER_UPDATE_MS,
    'updateOrderStatusToCancelled'
  );

  log.info('Order status updated to Cancelled', { orderDocId });
}

// ─── commissionSync Writeback ─────────────────────────────────────────────────

async function writeCommissionSync(
  orderDocId: string,
  syncStatus: 'ok' | 'failed' | 'not_applicable',
  log: ReturnType<typeof createLogger>
): Promise<void> {
  try {
    await withTimeout(
      () =>
        adminDb.collection('orders').doc(orderDocId).update({
          commissionSync: syncStatus,
          commissionSyncAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      TIMEOUT_COMMISSION_SYNC_MS,
      'writeCommissionSync'
    );
    log.info('commissionSync written to order', { orderDocId, syncStatus });
  } catch (err) {
    log.error('Failed to write commissionSync — manual reconciliation may be needed', {
      orderDocId,
      syncStatus,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Core Transaction: Cancel One Commission ──────────────────────────────────

async function cancelSingleCommission(
  commDocId: string,
  reason: ValidReason,
  callerUid: string,
  log: ReturnType<typeof createLogger>
): Promise<CancelResult> {
  const commRef = adminDb.collection('affiliate_commissions').doc(commDocId);

  return withTimeout(
    () =>
      adminDb.runTransaction(async (tx: Transaction): Promise<CancelResult> => {

        // ✅ ALL READS FIRST
        const commSnap = await tx.get(commRef);

        if (!commSnap.exists) {
          return {
            commissionDocId: commDocId,
            affiliateId: undefined,
            amountDeducted: 0,
            skipped: true,
            skipReason: 'commission_doc_not_found',
          };
        }

        const data = commSnap.data() as CommissionDoc;

        if (data.status === 'cancelled') {
          return {
            commissionDocId: commDocId,
            affiliateId: data.affiliateId,
            amountDeducted: 0,
            skipped: true,
            skipReason: 'already_cancelled',
          };
        }

        const amountToDeduct = parseSafeAmount(data.commissionAmount);
        const wasApproved = data.status === 'approved';
        const affiliateId = data.affiliateId;

        // ✅ Read profile BEFORE any writes
        let profileSnap: FirebaseFirestore.DocumentSnapshot | null = null;
        if (affiliateId && amountToDeduct > 0) {
          const profileRef = adminDb.collection('affiliateProfiles').doc(affiliateId);
          profileSnap = await tx.get(profileRef);
        }

        // ✅ ALL WRITES AFTER ALL READS
        tx.update(commRef, {
          status: 'cancelled',
          reason,
          cancelledBy: callerUid,
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          originalCommissionAmount: amountToDeduct,
          commissionAmount: 0,
        });

        if (affiliateId && amountToDeduct > 0 && profileSnap && profileSnap.exists) {
          const profileRef = adminDb.collection('affiliateProfiles').doc(affiliateId);
          const profile = profileSnap.data()!;
          const currentEarnings = Number(profile.totalEarnings ?? 0);
          const currentWithdrawable = Number(profile.withdrawableAmount ?? 0);
          const newEarnings = Math.max(0, currentEarnings - amountToDeduct);
          const newWithdrawable = wasApproved
            ? Math.max(0, currentWithdrawable - amountToDeduct)
            : currentWithdrawable;

          tx.update(profileRef, {
            totalEarnings: newEarnings,
            ...(wasApproved && { withdrawableAmount: newWithdrawable }),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (affiliateId && amountToDeduct > 0 && profileSnap && !profileSnap.exists) {
          log.warn('Affiliate profile not found — skipping earnings deduction', {
            affiliateId,
            commissionDocId: commDocId,
            amountToDeduct,
          });
        }

        return {
          commissionDocId: commDocId,
          affiliateId,
          amountDeducted: amountToDeduct,
          skipped: false,
        };
      }),
    TIMEOUT_TRANSACTION_MS,
    `cancelSingleCommission:${commDocId}`
  );
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  const requestId = randomUUID();

  // ── 1. Auth ───────────────────────────────────────────────────────────────────
  let callerUid: string | null;
  try {
    callerUid = await withTimeout(() => resolveCallerUid(req), TIMEOUT_AUTH_MS, 'resolveCallerUid');
  } catch (authErr) {
    bareLog.error('Auth timeout', {
      requestId,
      error: authErr instanceof AbortError ? 'timeout' : 'unexpected',
      durationMs: Date.now() - requestStart,
    });
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable. Please try again.', requestId },
      { status: 503 }
    );
  }

  if (!callerUid) {
    bareLog.warn('Unauthorized — missing or invalid token', { requestId });
    return NextResponse.json({ success: false, error: 'Unauthorized', requestId }, { status: 401 });
  }

  // ── 2. Parse & validate body ───────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', requestId },
      { status: 400 }
    );
  }

  const validation = validateBody(rawBody);
  if ('error' in validation) {
    return NextResponse.json(
      { success: false, error: validation.error, requestId },
      { status: validation.status }
    );
  }

  const { orderId, reason, paymentMethod, razorpayPaymentId, idempotencyKey } = validation.data;
  const cleanOrderId = String(validation.data.orderId).trim().toUpperCase();
  const log = createLogger({ requestId, orderId: cleanOrderId, callerUid });

  log.info('Cancel order request received', { idempotencyKey: idempotencyKey ?? null, reason });

  // ── 3. Rate limiting ───────────────────────────────────────────────────────────
  let rateLimitAllowed: boolean;
  try {
    rateLimitAllowed = await withTimeout(
      () => checkRateLimit(callerUid!, log),
      TIMEOUT_RATE_LIMIT_MS,
      'checkRateLimit'
    );
  } catch {
    rateLimitAllowed = true;
  }

  if (!rateLimitAllowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.',
        retryAfterMs: RATE_LIMIT_WINDOW_MS,
        requestId,
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) } }
    );
  }

  // ── 4. Idempotency check ───────────────────────────────────────────────────────
  if (idempotencyKey) {
    let idempotencyResult: IdempotencyCheckResult;
    try {
      idempotencyResult = await withTimeout(
        () => checkAndReserveIdempotencyKey(idempotencyKey, callerUid!, log),
        TIMEOUT_IDEMPOTENCY_MS,
        'checkAndReserveIdempotencyKey'
      );
    } catch {
      idempotencyResult = { outcome: 'proceed' };
    }

    if (idempotencyResult.outcome === 'cached') {
      return NextResponse.json(
        { ...idempotencyResult.response, requestId, durationMs: Date.now() - requestStart, fromCache: true },
        { status: 200 }
      );
    }

    if (idempotencyResult.outcome === 'in_flight') {
      return NextResponse.json(
        {
          success: false,
          error: 'A request with this idempotency key is currently being processed.',
          requestId,
        },
        { status: 409 }
      );
    }
  }

  try {
    // ── 5. Resolve order ───────────────────────────────────────────────────────────
    let order: Awaited<ReturnType<typeof resolveOrderByBusinessId>>;
    try {
      order = await withTimeout(
        () => resolveOrderByBusinessId(cleanOrderId),
        TIMEOUT_ORDER_RESOLVE_MS,
        'resolveOrderByBusinessId'
      );
    } catch (resolveErr) {
      const isTimeout = resolveErr instanceof AbortError;
      log.error('Order resolution failed', {
        error: isTimeout ? 'timeout' : resolveErr instanceof Error ? resolveErr.message : String(resolveErr),
      });
      return NextResponse.json(
        {
          success: false,
          error: isTimeout ? 'Order lookup timed out. Please try again.' : 'Failed to resolve order.',
          requestId,
        },
        { status: isTimeout ? 503 : 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found', requestId },
        { status: 404 }
      );
    }

    // ── 6. Ownership check ─────────────────────────────────────────────────────────
    const orderUserId = order.data.userId || order.data.uid || order.data.customerId;
    if (!orderUserId || orderUserId !== callerUid) {
      log.warn('Ownership check failed', { orderUserId: orderUserId ?? 'missing' });
      return NextResponse.json(
        { success: false, error: 'Forbidden: not your order', requestId },
        { status: 403 }
      );
    }

    // ── 7. Guard: already cancelled ────────────────────────────────────────────────
    const orderStatus: string = order.data.status ?? '';
    if (orderStatus === 'Cancelled' || orderStatus === 'cancelled') {
      log.info('Order already cancelled — returning early', { orderDocId: order.docId });
      return NextResponse.json(
        {
          success: true,
          orderId,
          message: 'Order is already cancelled.',
          updatedCount: 0,
          skippedCount: 0,
          requestId,
          durationMs: Date.now() - requestStart,
        },
        { status: 200 }
      );
    }

    // ── 8. Guard: non-cancellable statuses ─────────────────────────────────────────
    const nonCancellableStatuses = ['Delivered', 'delivered', 'Shipped', 'shipped', 'Out for Delivery'];
    if (nonCancellableStatuses.includes(orderStatus)) {
      log.warn('Order cannot be cancelled — status is terminal', { orderStatus });
      return NextResponse.json(
        {
          success: false,
          error: `Order cannot be cancelled because it is already ${orderStatus}.`,
          requestId,
        },
        { status: 422 }
      );
    }

    // ── 9. Update order status to Cancelled ────────────────────────────────────────
    try {
      await updateOrderStatusToCancelled(
        order.docId,
        reason ?? 'order_cancelled',
        paymentMethod,
        razorpayPaymentId,
        callerUid,
        log
      );
    } catch (updateErr) {
      const isTimeout = updateErr instanceof AbortError;
      log.error('Failed to update order status', {
        error: isTimeout ? 'timeout' : updateErr instanceof Error ? updateErr.message : String(updateErr),
        orderDocId: order.docId,
      });
      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? 'Order update timed out. Please try again.'
            : 'Could not update your order. Please try again or contact support.',
          requestId,
          durationMs: Date.now() - requestStart,
        },
        { status: isTimeout ? 503 : 500 }
      );
    }

    // ── 10. Find commission docs via indexed query ──────────────────────────────────
    let commissionsSnap: FirebaseFirestore.QuerySnapshot;
    try {
      commissionsSnap = await withTimeout(
        () =>
          adminDb
            .collection('affiliate_commissions')
            .where('orderId', '==', cleanOrderId)
            .get(),
        TIMEOUT_COMMISSIONS_MS,
        'fetchCommissions'
      );
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof AbortError;
      log.error('Commission fetch failed — order already cancelled', {
        error: isTimeout ? 'timeout' : fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      await writeCommissionSync(order.docId, 'failed', log);
      return NextResponse.json(
        {
          success: true,
          orderId,
          message: 'Order cancelled. Commission sync failed — our team has been notified.',
          commissionSync: 'failed',
          requestId,
          durationMs: Date.now() - requestStart,
        },
        { status: 200 }
      );
    }

    // ── 10a. FALLBACK: full collection scan if indexed query returned empty ─────────
    if (commissionsSnap.empty) {
      log.warn('Indexed commission query returned empty — attempting full-collection fallback scan', {
        orderId: cleanOrderId,
        orderDocId: order.docId,
      });

      let fallbackSnap: FirebaseFirestore.QuerySnapshot | null = null;
      try {
        fallbackSnap = await withTimeout(
          () => adminDb.collection('affiliate_commissions').get(),
          TIMEOUT_COMMISSIONS_MS,
          'fetchCommissionsFallback'
        );
      } catch (fallbackErr) {
        const isTimeout = fallbackErr instanceof AbortError;
        log.error('Fallback commission scan failed — proceeding without commission cancellation', {
          error: isTimeout ? 'timeout' : fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          orderId: cleanOrderId,
        });
        await writeCommissionSync(order.docId, 'failed', log);
        const response = {
          success: true,
          orderId,
          message: 'Order cancelled. Commission sync failed — our team has been notified.',
          updatedCount: 0,
          skippedCount: 0,
          results: [],
          commissionSync: 'failed',
          requestId,
          durationMs: Date.now() - requestStart,
        };
        if (idempotencyKey) await writeIdempotencyResult(idempotencyKey, callerUid, response, log);
        return NextResponse.json(response, { status: 200 });
      }

      const matchedDocs = fallbackSnap.docs.filter(
        (d) => String(d.data().orderId).trim().toUpperCase() === cleanOrderId
      );

      log.info('Fallback commission scan complete', {
        totalScanned: fallbackSnap.size,
        matched: matchedDocs.length,
        orderId: cleanOrderId,
      });

      if (matchedDocs.length === 0) {
        log.info('No commission records found after fallback scan', {
          durationMs: Date.now() - requestStart,
        });
        await writeCommissionSync(order.docId, 'not_applicable', log);

        const response = {
          success: true,
          orderId,
          message: 'Order cancelled successfully.',
          updatedCount: 0,
          skippedCount: 0,
          results: [],
          requestId,
          durationMs: Date.now() - requestStart,
        };

        if (idempotencyKey) await writeIdempotencyResult(idempotencyKey, callerUid, response, log);
        return NextResponse.json(response, { status: 200 });
      }

      const fallbackResults: CancelResult[] = [];
      const fallbackErrors: Array<{ commDocId: string; error: string }> = [];

      await Promise.allSettled(
        matchedDocs.map(async (commDoc) => {
          try {
            const result = await cancelSingleCommission(
              commDoc.id,
              reason as ValidReason,
              callerUid!,
              log
            );
            fallbackResults.push(result);
          } catch (txError) {
            const errMsg =
              txError instanceof AbortError
                ? `timeout after ${TIMEOUT_TRANSACTION_MS}ms`
                : txError instanceof Error
                ? txError.message
                : String(txError);
            log.error('Transaction failed for commission doc (fallback path)', {
              commDocId: commDoc.id,
              error: errMsg,
            });
            fallbackErrors.push({ commDocId: commDoc.id, error: errMsg });
          }
        })
      );

      const fallbackUpdatedCount = fallbackResults.filter((r) => !r.skipped).length;
      const fallbackSkippedCount = fallbackResults.filter((r) => r.skipped).length;
      const fallbackTotalAmountDeducted = fallbackResults.reduce((sum, r) => sum + r.amountDeducted, 0);
      const fallbackHasPartialFailure = fallbackErrors.length > 0;

      await writeCommissionSync(order.docId, fallbackHasPartialFailure ? 'failed' : 'ok', log);

      log.info('Fallback commission cancellation complete', {
        updatedCount: fallbackUpdatedCount,
        skippedCount: fallbackSkippedCount,
        totalAmountDeducted: fallbackTotalAmountDeducted,
        errorCount: fallbackErrors.length,
        durationMs: Date.now() - requestStart,
      });

      const fallbackResponse = {
        success: true,
        orderId,
        message: fallbackHasPartialFailure
          ? 'Order cancelled. Some commissions could not be updated — our team has been notified.'
          : 'Order cancelled successfully.',
        updatedCount: fallbackUpdatedCount,
        skippedCount: fallbackSkippedCount,
        totalAmountDeducted: fallbackTotalAmountDeducted,
        ...(fallbackHasPartialFailure && {
          partialFailure: true,
          failedCount: fallbackErrors.length,
        }),
        requestId,
        durationMs: Date.now() - requestStart,
      };

      if (idempotencyKey && !fallbackHasPartialFailure) {
        await writeIdempotencyResult(idempotencyKey, callerUid, fallbackResponse, log);
      }

      return NextResponse.json(fallbackResponse, { status: 200 });
    }

    // ── 11. Cancel each commission atomically ──────────────────────────────────────
    const results: CancelResult[] = [];
    const errors: Array<{ commDocId: string; error: string }> = [];

    await Promise.allSettled(
      commissionsSnap.docs.map(async (commDoc) => {
        try {
          const result = await cancelSingleCommission(commDoc.id, reason as ValidReason, callerUid!, log);
          results.push(result);
        } catch (txError) {
          const errMsg =
            txError instanceof AbortError
              ? `timeout after ${TIMEOUT_TRANSACTION_MS}ms`
              : txError instanceof Error
              ? txError.message
              : String(txError);
          log.error('Transaction failed for commission doc', { commDocId: commDoc.id, error: errMsg });
          errors.push({ commDocId: commDoc.id, error: errMsg });
        }
      })
    );

    const updatedCount = results.filter((r) => !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const totalAmountDeducted = results.reduce((sum, r) => sum + r.amountDeducted, 0);
    const hasPartialFailure = errors.length > 0;

    // ── 12. Write commissionSync ────────────────────────────────────────────────────
    await writeCommissionSync(order.docId, hasPartialFailure ? 'failed' : 'ok', log);

    log.info('Cancel order complete', {
      updatedCount,
      skippedCount,
      totalAmountDeducted,
      errorCount: errors.length,
      durationMs: Date.now() - requestStart,
    });

    const response = {
      success: true,
      orderId,
      message: hasPartialFailure
        ? 'Order cancelled. Some commissions could not be updated — our team has been notified.'
        : 'Order cancelled successfully.',
      updatedCount,
      skippedCount,
      totalAmountDeducted,
      ...(hasPartialFailure && { partialFailure: true, failedCount: errors.length }),
      requestId,
      durationMs: Date.now() - requestStart,
    };

    if (idempotencyKey && !hasPartialFailure) {
      await writeIdempotencyResult(idempotencyKey, callerUid, response, log);
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const { status, label } = categorizeError(error);
    log.error('Unhandled error in cancel order route', {
      error: label,
      httpStatus: status,
      durationMs: Date.now() - requestStart,
    });
    return NextResponse.json(
      {
        success: false,
        error: status === 503
          ? 'Service temporarily unavailable. Please try again.'
          : 'Internal server error',
        requestId,
        durationMs: Date.now() - requestStart,
      },
      { status }
    );
  }
}