/**
 * FastGet branded email templates.
 * Brand: primary #F5A623 (amber), charcoal #1C1C1E, slate #6B6B6E
 */

import type { Order } from '@/types';

const P = '#F5A623'; // brand-primary
const D = '#DC8A0E'; // brand-dark
const C = '#1C1C1E'; // brand-charcoal
const S = '#6B6B6E'; // brand-slate
const G = '#F5F5F5'; // brand-fog (background)

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FastGet</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${G};font-family:Inter,Arial,system-ui,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${G};padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0" role="presentation">

      <!-- Logotype -->
      <tr><td align="center" style="padding-bottom:28px;">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="width:44px;height:44px;background:${P};border-radius:12px;text-align:center;vertical-align:middle;">
              <span style="font-size:22px;font-weight:900;color:#fff;line-height:44px;display:block;">F</span>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="font-size:20px;font-weight:800;color:${C};letter-spacing:-0.4px;">FastGet</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${body}
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:28px 0 0;">
        <p style="margin:0;font-size:12px;color:#9A9A9A;line-height:1.6;">
          If you didn't create a FastGet account, you can safely ignore this email.<br>
          &copy; ${new Date().getFullYear()} FastGet &mdash; Mumbai&apos;s fastest building materials delivery.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,${P} 0%,${D} 100%);color:#ffffff;font-size:15px;font-weight:700;border-radius:50px;text-decoration:none;letter-spacing:0.2px;">${label}</a>`;
}

function fallbackLink(href: string): string {
  return `<p style="margin:20px 0 0;font-size:12px;color:#9A9A9A;">
    Button not working? Copy and paste this link into your browser:<br>
    <a href="${href}" style="color:${P};word-break:break-all;">${href}</a>
  </p>`;
}

// ── OTP Verification ──────────────────────────────────────────────────────────

export function otpVerificationEmailTemplate(
  name: string,
  otp: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">✉️</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">Your verification code</h1>
      <p style="margin:0 0 28px;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, enter this code in the FastGet app to activate your account.
      </p>
      <div style="background:${G};border-radius:16px;padding:20px 32px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:44px;font-weight:900;letter-spacing:0.2em;color:${C};font-family:monospace,Courier New;">${otp}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#9A9A9A;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>`;
  return {
    subject: 'Your FastGet verification code',
    html: wrap(body),
    text: `Hi ${name},\n\nYour FastGet verification code is:\n\n${otp}\n\nEnter this code in the app to activate your account. It expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
  };
}

export function resendOtpEmailTemplate(
  name: string,
  otp: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">🔄</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">New verification code</h1>
      <p style="margin:0 0 28px;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, here is your new verification code. Your previous code has been invalidated.
      </p>
      <div style="background:${G};border-radius:16px;padding:20px 32px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:44px;font-weight:900;letter-spacing:0.2em;color:${C};font-family:monospace,Courier New;">${otp}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#9A9A9A;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>`;
  return {
    subject: 'Your new FastGet verification code',
    html: wrap(body),
    text: `Hi ${name},\n\nYour new FastGet verification code is:\n\n${otp}\n\nEnter this code in the app. It expires in 10 minutes.`,
  };
}

// ── Verify Email ──────────────────────────────────────────────────────────────

export function verificationEmailTemplate(
  name: string,
  verifyUrl: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">✉️</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">Verify your email address</h1>
      <p style="margin:0 0 32px;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, welcome to FastGet! 🎉<br>
        Please verify your email to activate your account and start ordering.
      </p>
      ${ctaButton(verifyUrl, 'Verify Email Address')}
      ${fallbackLink(verifyUrl)}
      <p style="margin:20px 0 0;font-size:12px;color:#9A9A9A;">This link expires in <strong>24 hours</strong>.</p>
    </div>`;
  return {
    subject: 'Verify your FastGet email address',
    html: wrap(body),
    text: `Hi ${name},\n\nWelcome to FastGet! Please verify your email by visiting:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.`,
  };
}

// ── Resend Verification ───────────────────────────────────────────────────────

export function resendVerificationTemplate(
  name: string,
  verifyUrl: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">🔄</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">New verification link</h1>
      <p style="margin:0 0 32px;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, here is your new email verification link.<br>
        Your previous link has been invalidated.
      </p>
      ${ctaButton(verifyUrl, 'Verify Email Address')}
      ${fallbackLink(verifyUrl)}
      <p style="margin:20px 0 0;font-size:12px;color:#9A9A9A;">This link expires in <strong>24 hours</strong>.</p>
    </div>`;
  return {
    subject: 'Your new FastGet verification link',
    html: wrap(body),
    text: `Hi ${name},\n\nHere is your new verification link:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  };
}

// ── Password Reset OTP ────────────────────────────────────────────────────────

export function passwordResetOtpTemplate(
  name: string,
  otp: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">🔐</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">Password reset code</h1>
      <p style="margin:0 0 28px;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, enter this code in the FastGet app to reset your password.
      </p>
      <div style="background:${G};border-radius:16px;padding:20px 32px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:44px;font-weight:900;letter-spacing:0.2em;color:${C};font-family:monospace,Courier New;">${otp}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#9A9A9A;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>`;
  return {
    subject: 'Your FastGet password reset code',
    html: wrap(body),
    text: `Hi ${name},\n\nYour FastGet password reset code is:\n\n${otp}\n\nEnter this code in the app. It expires in 10 minutes.\n\nIf you didn't request a reset, ignore this email — your password won't change.`,
  };
}

// ── Password Reset ────────────────────────────────────────────────────────────

export function passwordResetTemplate(
  name: string,
  resetUrl: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">🔐</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">Reset your password</h1>
      <p style="margin:0 0 32px;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, we received a request to reset your FastGet password.<br>
        Click below to choose a new password.
      </p>
      ${ctaButton(resetUrl, 'Reset Password')}
      ${fallbackLink(resetUrl)}
      <p style="margin:20px 0 0;font-size:12px;color:#9A9A9A;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, your password is safe — just ignore this email.</p>
    </div>`;
  return {
    subject: 'Reset your FastGet password',
    html: wrap(body),
    text: `Hi ${name},\n\nReset your password by visiting:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore the email — your password won't change.`,
  };
}

// ── Password Changed ──────────────────────────────────────────────────────────

export function passwordChangedTemplate(
  name: string,
): { subject: string; html: string; text: string } {
  const safeName = esc(name);
  const body = `
    <div style="padding:44px 40px;text-align:center;">
      <div style="font-size:44px;margin-bottom:20px;">✅</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${C};line-height:1.2;">Password changed</h1>
      <p style="margin:0;font-size:15px;color:${S};line-height:1.6;">
        Hi ${safeName}, your FastGet password has been successfully changed.<br><br>
        If you did not make this change, please contact our support team immediately.
      </p>
    </div>`;
  return {
    subject: 'Your FastGet password has been changed',
    html: wrap(body),
    text: `Hi ${name},\n\nYour FastGet password has been successfully changed.\n\nIf you did not make this change, contact support immediately.`,
  };
}

// ── New Order Placed (staff alert) ─────────────────────────────────────────────
// Sent to admin/agent users — see src/lib/order-notifications.ts. Durable
// backup to the Telegram alert (which is the primary, instant channel).

export function orderPlacedStaffEmailTemplate(
  order: Order,
  appUrl: string,
): { subject: string; html: string; text: string } {
  const orderUrl = `${appUrl}/admin/orders/${order.id}`;
  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:${C};">${esc(item.name)} <span style="color:${S};">&times;${item.quantity}</span></td>
        <td style="padding:8px 0;font-size:14px;color:${C};text-align:right;white-space:nowrap;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>`,
    )
    .join('');
  const itemsText = order.items.map((i) => `  - ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`).join('\n');

  const body = `
    <div style="padding:36px 40px;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:40px;">🛒</div>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:${C};">New order placed</h1>
        <p style="margin:6px 0 0;font-size:14px;color:${S};">₹${order.total.toLocaleString('en-IN')} &middot; ${order.deliveryType === 'urgent' ? 'Urgent' : 'Scheduled'} &middot; ${esc(order.paymentMethod.toUpperCase())}</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;background:${G};border-radius:14px;padding:18px 20px;">
        <tr><td style="font-size:13px;color:${S};padding:4px 0;">Customer</td><td style="font-size:13px;color:${C};font-weight:600;text-align:right;padding:4px 0;">${esc(order.customerName)}</td></tr>
        <tr><td style="font-size:13px;color:${S};padding:4px 0;">Phone</td><td style="font-size:13px;color:${C};font-weight:600;text-align:right;padding:4px 0;">${esc(order.customerPhone)}</td></tr>
        <tr><td style="font-size:13px;color:${S};padding:4px 0;vertical-align:top;">Address</td><td style="font-size:13px;color:${C};font-weight:600;text-align:right;padding:4px 0;">${esc(order.siteAddress)}</td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #EEE;padding-top:4px;">
        ${itemsRows}
      </table>

      <div style="text-align:center;margin:28px 0 8px;">
        ${ctaButton(orderUrl, 'View order')}
      </div>
      ${fallbackLink(orderUrl)}
    </div>`;

  return {
    subject: `New order — ₹${order.total.toLocaleString('en-IN')} from ${order.customerName}`,
    html: wrap(body),
    text: `New order placed\n\nCustomer: ${order.customerName}\nPhone: ${order.customerPhone}\nAddress: ${order.siteAddress}\nTotal: ₹${order.total}\n\nItems:\n${itemsText}\n\nView: ${orderUrl}`,
  };
}
