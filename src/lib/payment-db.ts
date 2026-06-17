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
 * Stores the Razorpay order ID on an existing DB order right after the Razorpay
 * order is created, so it can be reconciled during verification.
 */
export async function setRazorpayOrderId(
  orderId: string,
  razorpayOrderId: string
): Promise<boolean> {
  await ensurePaymentColumns();
  const sql = getUnpooledConnection();
  try {
    await sql`
      UPDATE orders SET razorpay_order_id = ${razorpayOrderId}
      WHERE id = ${orderId}
    `;
    return true;
  } catch (error) {
    logger.error('DB', 'Failed to set razorpay_order_id', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
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
 * Cancels an unpaid Razorpay order. Uses a conditional WHERE so it is safe to
 * call multiple times — it only cancels if payment has not been captured yet.
 */
export async function cancelUnpaidOrder(orderId: string): Promise<boolean> {
  await ensurePaymentColumns();
  const sql = getUnpooledConnection();
  try {
    const result = await sql`
      UPDATE orders
      SET status = 'cancelled'
      WHERE id           = ${orderId}
        AND payment_method = 'razorpay'
        AND payment_status IS NULL
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    logger.error('DB', 'Failed to cancel unpaid order', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Fetches the razorpay_order_id stored during create-order so the callback can
 * cross-validate what Razorpay POSTs against what we originally issued.
 */
export async function getOrderRazorpayOrderId(orderId: string): Promise<string | null> {
  const sql = getUnpooledConnection();
  try {
    const result = await sql`
      SELECT razorpay_order_id FROM orders WHERE id = ${orderId} LIMIT 1
    `;
    return result.length > 0
      ? (result[0] as { razorpay_order_id: string | null }).razorpay_order_id
      : null;
  } catch (error) {
    logger.error('DB', 'Failed to get razorpay_order_id', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
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
