/**
 * FastGet Email Service
 *
 * Provider abstraction — configure via environment variables:
 *
 *   EMAIL_PROVIDER=mock        (default; logs to console, no real delivery)
 *   EMAIL_PROVIDER=resend      → requires RESEND_API_KEY
 *   EMAIL_PROVIDER=sendgrid    → requires SENDGRID_API_KEY
 *   EMAIL_PROVIDER=smtp        → requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *                                (also needs `npm install nodemailer`)
 *
 *   EMAIL_FROM=FastGet <noreply@fastget.in>   (sender address, all providers)
 *   APP_URL=https://yourapp.com               (used in email links)
 */

import { Resend } from 'resend';
import { logger } from './logger';

export type EmailProvider = 'mock' | 'resend' | 'sendgrid' | 'smtp';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getProvider(): EmailProvider {
  const p = (process.env.EMAIL_PROVIDER || '').toLowerCase() as EmailProvider;
  if (['mock', 'resend', 'sendgrid', 'smtp'].includes(p)) return p;
  return 'mock';
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'FastGet <noreply@fastget.in>';
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    'http://localhost:3000'
  );
}

// Returns the base for deep-link URLs used in mobile emails.
// Format: `${getDeepLinkUrl()}path?query` → e.g. fastget://verify-email?token=…
export function getDeepLinkUrl(): string {
  return process.env.DEEP_LINK_SCHEME || 'fastget://';
}

// ── Mock provider ─────────────────────────────────────────────────────────────

async function sendViaMock(msg: EmailMessage): Promise<boolean> {
  const border = '─'.repeat(52);
  console.log(`\n📧 MOCK EMAIL ${border}`);
  console.log(`  To:      ${msg.to}`);
  console.log(`  Subject: ${msg.subject}`);
  if (msg.text) {
    console.log(`  Body:\n${msg.text.split('\n').map(l => '    ' + l).join('\n')}`);
  }
  console.log(`${border}\n`);
  logger.info('Email', `[mock] → ${msg.to} | ${msg.subject}`);
  return true;
}

// ── Resend provider (official SDK) ───────────────────────────────────────────

async function sendViaResend(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('Email', 'RESEND_API_KEY not set — falling back to mock');
    return sendViaMock(msg);
  }
  try {
    const client = new Resend(apiKey);
    const { data, error } = await client.emails.send({
      from: getFrom(),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (error) {
      logger.error('Email', 'Resend SDK error', {
        name: error.name,
        message: error.message,
        statusCode: (error as { statusCode?: number }).statusCode,
      });
      return false;
    }
    logger.debug('Email', 'Resend message ID', { id: data?.id });
    logger.info('Email', `Sent via Resend → ${msg.to}`);
    return true;
  } catch (error) {
    logger.error('Email', 'Resend send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ── SendGrid provider ─────────────────────────────────────────────────────────

async function sendViaSendGrid(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    logger.warn('Email', 'SENDGRID_API_KEY not set — falling back to mock');
    return sendViaMock(msg);
  }
  const fromRaw = getFrom();
  // Parse "Name <email>" into { name, email } for SendGrid
  const match = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
  const fromObj = match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { email: fromRaw };
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: fromObj,
        subject: msg.subject,
        content: [
          { type: 'text/html', value: msg.html },
          ...(msg.text ? [{ type: 'text/plain', value: msg.text }] : []),
        ],
      }),
    });
    // SendGrid returns 202 Accepted on success (no body)
    if (!res.ok && res.status !== 202) {
      const body = await res.text().catch(() => '');
      logger.error('Email', 'SendGrid API error', { status: res.status, body });
      return false;
    }
    logger.info('Email', `Sent via SendGrid → ${msg.to}`);
    return true;
  } catch (error) {
    logger.error('Email', 'SendGrid send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ── SMTP provider ─────────────────────────────────────────────────────────────
// Requires nodemailer: npm install nodemailer @types/nodemailer
// Falls back to mock if nodemailer is not installed.

async function sendViaSmtp(msg: EmailMessage): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = getFrom();

  if (!host || !user || !pass) {
    logger.error('Email', 'SMTP requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD — falling back to mock');
    return sendViaMock(msg);
  }

  try {
    // Dynamic import so the build doesn't fail when nodemailer isn't installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    logger.info('Email', `Sent via SMTP → ${msg.to}`);
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND'
    ) {
      logger.error(
        'Email',
        'nodemailer not installed. Run: npm install nodemailer — falling back to mock',
      );
      return sendViaMock(msg);
    }
    logger.error('Email', 'SMTP send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const provider = getProvider();
  logger.debug('Email', `Dispatching via ${provider}`, { to: msg.to, subject: msg.subject });
  switch (provider) {
    case 'resend':   return sendViaResend(msg);
    case 'sendgrid': return sendViaSendGrid(msg);
    case 'smtp':     return sendViaSmtp(msg);
    default:         return sendViaMock(msg);
  }
}
