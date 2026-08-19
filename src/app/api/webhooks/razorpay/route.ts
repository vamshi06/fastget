import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { reconcileCapturedPayment } from '@/lib/payment-db';
import { logger } from '@/lib/logger';

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
}

/**
 * POST /api/webhooks/razorpay
 *
 * Server-to-server event delivery configured in Razorpay Dashboard →
 * Settings → Webhooks. This is a reconciliation/observability signal, NOT
 * the primary payment-confirmation path — orders are created synchronously
 * in /api/payment/verify-payment when the customer's browser returns from
 * checkout. This endpoint catches what that path can miss (e.g. the customer
 * closes the tab right after paying, before the redirect completes) by
 * re-confirming payment_status on orders that already exist.
 *
 * Requires RAZORPAY_WEBHOOK_SECRET — a separate secret from
 * RAZORPAY_KEY_SECRET, generated when the webhook is created in the
 * Dashboard. Must read the RAW body for signature verification: do not call
 * request.json() before verifyWebhookSignature runs on the raw text.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const signature = request.headers.get('x-razorpay-signature');
  const rawBody = await request.text();

  if (!signature) {
    logger.warn('Webhook', 'razorpay — missing signature header');
    logger.api('POST', '/api/webhooks/razorpay', 400, Date.now() - start);
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let isValid: boolean;
  try {
    isValid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    // RAZORPAY_WEBHOOK_SECRET not configured — our misconfiguration, not the caller's.
    logger.error('Webhook', 'razorpay — verifyWebhookSignature threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    logger.api('POST', '/api/webhooks/razorpay', 500, Date.now() - start);
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!isValid) {
    logger.warn('Webhook', 'razorpay — signature mismatch');
    logger.api('POST', '/api/webhooks/razorpay', 400, Date.now() - start);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    logger.warn('Webhook', 'razorpay — malformed JSON body');
    logger.api('POST', '/api/webhooks/razorpay', 400, Date.now() - start);
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 });
  }

  const eventType = event.event ?? 'unknown';
  const payment = event.payload?.payment?.entity;

  logger.info('Webhook', 'razorpay — event received', {
    eventType,
    razorpayPaymentId: payment?.id,
    razorpayOrderId: payment?.order_id,
  });

  try {
    if (eventType === 'payment.captured' && payment?.id && payment?.order_id) {
      const reconciled = await reconcileCapturedPayment(payment.order_id, payment.id);
      if (!reconciled) {
        // Either already captured (expected — verify-payment usually wins the
        // race) or no matching order row exists at all, meaning the customer's
        // browser never completed /api/payment/verify-payment after paying.
        // Logged as WARN so it's visible for manual reconciliation — we were
        // paid but have no order to fulfil.
        logger.warn('Webhook', 'razorpay — payment.captured with no row updated', {
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
        });
      }
    } else if (eventType === 'payment.failed') {
      logger.info('Webhook', 'razorpay — payment.failed', {
        razorpayOrderId: payment?.order_id,
        razorpayPaymentId: payment?.id,
      });
    }
    // Other event types (refund.*, order.paid, dispute.*, etc.) are accepted
    // but not acted on yet — extend here if/when those flows are needed.
  } catch (err) {
    logger.error('Webhook', 'razorpay — handler error', {
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
    logger.api('POST', '/api/webhooks/razorpay', 500, Date.now() - start);
    // 500 so Razorpay retries — this was our failure, not a bad request.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  logger.api('POST', '/api/webhooks/razorpay', 200, Date.now() - start);
  return NextResponse.json({ received: true });
}
