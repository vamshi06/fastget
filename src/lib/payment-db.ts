import { getUnpooledConnection } from '@/lib/db';
import { logger } from '@/lib/logger';

// Run once per server lifetime — idempotent on repeat calls (IF NOT EXISTS).
let columnsEnsured = false;

async function ensurePaymentColumns(): Promise<void> {
  if (columnsEnsured) return;
  const sql = getUnpooledConnection();
  try {
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status        VARCHAR(20)`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id     TEXT`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id   TEXT`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature     TEXT`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_captured_at   TIMESTAMP WITH TIME ZONE`;
    columnsEnsured = true;
    logger.info('DB', 'Payment columns verified / added');
  } catch (error) {
    logger.error('DB', 'ensurePaymentColumns failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Records payment confirmation after successful signature verification.
 * Stores all three Razorpay identifiers, marks payment_status = 'captured',
 * and timestamps when capture occurred.
 */
export async function confirmOrderPayment(
  orderId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
): Promise<boolean> {
  await ensurePaymentColumns();
  const sql = getUnpooledConnection();
  try {
    const result = await sql`
      UPDATE orders
      SET razorpay_payment_id  = ${razorpayPaymentId},
          razorpay_order_id    = ${razorpayOrderId},
          razorpay_signature   = ${razorpaySignature},
          payment_status       = 'captured',
          payment_captured_at  = NOW()
      WHERE id = ${orderId}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    logger.error('DB', 'Failed to confirm order payment', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Reconciles a `payment.captured` webhook event against an existing order row.
 * This is a safety net, not the primary confirmation path (that's
 * confirmOrderPayment, called from /api/payment/verify-payment when the
 * customer's browser returns from checkout). No order row exists here at all
 * if the customer closed the tab right after paying — this update simply
 * no-ops in that case (0 rows matched); the caller logs that for visibility.
 */
export async function reconcileCapturedPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<boolean> {
  await ensurePaymentColumns();
  const sql = getUnpooledConnection();
  try {
    const result = await sql`
      UPDATE orders
      SET razorpay_payment_id  = ${razorpayPaymentId},
          payment_status       = 'captured',
          payment_captured_at  = COALESCE(payment_captured_at, NOW())
      WHERE razorpay_order_id = ${razorpayOrderId}
        AND payment_status IS DISTINCT FROM 'captured'
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    logger.error('DB', 'Failed to reconcile webhook payment', {
      razorpayOrderId,
      razorpayPaymentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Deletes an order by ID. Used to clean up an orphaned DB order when the
 * Razorpay order creation fails immediately after the DB write.
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const sql = getUnpooledConnection();
  try {
    await sql`DELETE FROM orders WHERE id = ${orderId}`;
  } catch (error) {
    logger.error('DB', 'Failed to delete orphaned order', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Fetches the status_token for a given order ID (needed to redirect after payment).
 */
export async function getStatusToken(orderId: string): Promise<string | null> {
  const sql = getUnpooledConnection();
  try {
    const result = await sql`
      SELECT status_token FROM orders WHERE id = ${orderId} LIMIT 1
    `;
    return result.length > 0 ? (result[0] as { status_token: string }).status_token : null;
  } catch (error) {
    logger.error('DB', 'Failed to get status_token', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
