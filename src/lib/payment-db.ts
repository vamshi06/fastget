import { getUnpooledConnection } from '@/lib/db';
import { logger } from '@/lib/logger';

// Run column migration once per module load (idempotent — ADD COLUMN IF NOT EXISTS)
let migrationRan = false;

export async function ensurePaymentColumns(): Promise<void> {
  if (migrationRan) return;
  const sql = getUnpooledConnection();
  try {
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`;
    migrationRan = true;
    logger.info('DB', 'Payment columns ensured on orders table');
  } catch (error) {
    logger.error('DB', 'Failed to ensure payment columns', {
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
 * Records the Razorpay payment ID after successful signature verification,
 * marking the order as paid.
 */
export async function confirmOrderPayment(
  orderId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string
): Promise<boolean> {
  const sql = getUnpooledConnection();
  try {
    const result = await sql`
      UPDATE orders
      SET razorpay_payment_id = ${razorpayPaymentId},
          razorpay_order_id   = ${razorpayOrderId}
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
