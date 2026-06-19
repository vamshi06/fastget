import Razorpay from 'razorpay';
import crypto from 'crypto';

let instance: Razorpay | null = null;

function getInstance(): Razorpay {
  if (instance) return instance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }

  instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return instance;
}

/**
 * Creates a Razorpay order.
 * @param amountInRupees - Order total in rupees (converted to paise internally)
 * @param currency - e.g. 'INR'
 * @param receipt - Optional reference shown in the Razorpay dashboard
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  currency: string,
  receipt?: string
) {
  const rz = getInstance();
  const amountInPaise = Math.round(amountInRupees * 100);
  const ref = receipt ?? `fg_${Date.now()}`;

  return rz.orders.create({ amount: amountInPaise, currency, receipt: ref });
}

/**
 * Fetches a payment from Razorpay to check its actual status.
 * Used after signature verification to confirm the payment was captured,
 * not just that the response was signed (cancelled payments are also signed).
 */
export async function fetchPayment(paymentId: string) {
  const rz = getInstance();
  return rz.payments.fetch(paymentId);
}

/**
 * Verifies the Razorpay payment signature using HMAC SHA256.
 * The signed body is: `razorpay_order_id|razorpay_payment_id`
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET not configured');

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');

  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expected, 'hex');
    if (sigBuffer.length !== expBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expBuffer);
  } catch {
    return false;
  }
}
