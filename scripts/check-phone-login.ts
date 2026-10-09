#!/usr/bin/env tsx
/**
 * check-phone-login.ts - is phone login (WhatsApp OTP) set up correctly?
 *
 *   npm run check-phone-login                 read-only checks
 *   npm run check-phone-login -- --send 98XXXXXXXX
 *                                             ...then send ONE real test code to
 *                                             that number (costs one message)
 *
 * Checks, in order: settings (env vars) -> database (migration 025, shared
 * numbers) -> WhatsApp number + token -> OTP template. Every problem names the
 * step in docs/PHONE_LOGIN_SETUP.md that fixes it. Nothing is changed except
 * the optional test message.
 */
import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { normalizeIndianMobile } from '@/lib/phone-otp';

type Status = 'ok' | 'warn' | 'fail';
const results: Status[] = [];
function report(status: Status, label: string, detail = '') {
  results.push(status);
  const icon = status === 'ok' ? '✅' : status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${icon} ${label}${detail ? `\n     ${detail}` : ''}`);
}
const section = (title: string) => console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);

const env = process.env;
const API_VERSION = env.WHATSAPP_API_VERSION || 'v21.0';
const TEMPLATE = env.WHATSAPP_OTP_TEMPLATE || 'fastget_login_code';
const TEMPLATE_LANG = env.WHATSAPP_TEMPLATE_LANG || 'en';

async function graph(pathAndQuery: string): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  console.log('FastGet phone login - setup check (guide: docs/PHONE_LOGIN_SETUP.md)');

  // ── 1. Settings ───────────────────────────────────────────────────────────
  // .env.local by default; `railway run npm run check-phone-login:railway` checks only Railway's values.
  section('1. Settings');
  if (env.NEXT_PUBLIC_PHONE_LOGIN_ENABLED === 'true') report('ok', 'Phone login switch is ON');
  else report('warn', 'Phone login switch is OFF', 'Customers won’t see it until NEXT_PUBLIC_PHONE_LOGIN_ENABLED=true and a redeploy (step B3-B4). Fine while setting up.');

  report(env.ADMIN_SESSION_SECRET ? 'ok' : 'fail', 'ADMIN_SESSION_SECRET set', env.ADMIN_SESSION_SECRET ? '' : 'Required (codes are hashed with it).');
  const dbUrl = env.DATABASE_URL || env.fastget_DATABASE_URL;
  report(dbUrl ? 'ok' : 'fail', 'Database URL set', dbUrl ? '' : 'Set DATABASE_URL (or fastget_DATABASE_URL).');

  const hasId = Boolean(env.WHATSAPP_PHONE_NUMBER_ID);
  const hasToken = Boolean(env.WHATSAPP_ACCESS_TOKEN);
  report(hasId ? 'ok' : 'fail', 'WHATSAPP_PHONE_NUMBER_ID set', hasId ? '' : 'From Meta app -> WhatsApp -> API Setup (step A8).');
  report(hasToken ? 'ok' : 'fail', 'WHATSAPP_ACCESS_TOKEN set', hasToken ? '' : 'Permanent System User token (step A7).');
  report('ok', `Template: "${TEMPLATE}" (${TEMPLATE_LANG})`);

  // ── 2. Database ───────────────────────────────────────────────────────────
  section('2. Database');
  const parked = fs.existsSync(path.join(__dirname, '..', 'db', 'migrations-pending', '025_phone_login.sql'));
  const moved = fs.existsSync(path.join(__dirname, '..', 'db', 'migrations', '025_phone_login.sql'));
  if (moved) report('ok', 'Migration 025 is in db/migrations');
  else if (parked) report('warn', 'Migration 025 is still parked in db/migrations-pending', 'Move it to db/migrations when ready (step B2).');
  else report('fail', 'Migration 025 file not found');

  if (dbUrl) {
    try {
      const sql = neon(dbUrl.replace('-pooler', ''));
      const shared = (await sql`
        SELECT RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) AS n, COUNT(*)::int AS c
        FROM users GROUP BY 1 HAVING COUNT(*) > 1
      `) as { n: string; c: number }[];
      if (shared.length === 0) report('ok', 'No phone number is shared by several accounts');
      else report('fail', `${shared.length} phone number(s) shared by several accounts`,
        `Ending ${shared.map((s) => `${String(s.n).slice(-4)} (${s.c} accounts)`).join(', ')} - fix before the migration (step B1).`);

      const [state] = (await sql`
        SELECT
          to_regclass('public.phone_otps') IS NOT NULL AS otp_table,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_verified') AS verified_col,
          EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_users_phone_last10') AS unique_idx
      `) as { otp_table: boolean; verified_col: boolean; unique_idx: boolean }[];
      const applied = state.otp_table && state.verified_col && state.unique_idx;
      if (applied) report('ok', 'Migration 025 is applied (phone_otps table, phone_verified, unique numbers)');
      else report(moved ? 'fail' : 'warn', 'Migration 025 is not applied to this database',
        `Missing: ${[!state.otp_table && 'phone_otps table', !state.verified_col && 'users.phone_verified', !state.unique_idx && 'unique phone index'].filter(Boolean).join(', ')} - run npm run sync-schema (step B2).`);
    } catch (e) {
      report('fail', 'Could not check the database', e instanceof Error ? e.message : String(e));
    }
  }

  // ── 3. WhatsApp number + token ────────────────────────────────────────────
  section('3. WhatsApp number + access token');
  if (!hasId || !hasToken) {
    report('warn', 'Skipped - set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN first');
  } else {
    const r = await graph(`${env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,name_status,quality_rating,code_verification_status`);
    if (!r.ok) {
      const msg = r.body?.error?.message || `HTTP ${r.status}`;
      report('fail', 'Meta rejected the number ID / token', `${msg}\n     Check the token is the permanent one with whatsapp_business_messaging (A7) and the ID is the Phone number ID (A8).`);
    } else {
      const p = r.body;
      report('ok', `Token works - sending as ${p.display_phone_number} ("${p.verified_name}")`);
      if (p.code_verification_status && p.code_verification_status !== 'VERIFIED') {
        report('fail', `Number not verified (${p.code_verification_status})`, 'Finish the SMS/call verification of the number (step A4).');
      } else report('ok', 'Number is verified');
      if (p.name_status && !['APPROVED', 'AVAILABLE_WITHOUT_REVIEW'].includes(p.name_status)) {
        report('warn', `Display name status: ${p.name_status}`, 'Waiting for Meta to approve "FastGet" (step A4) - messages may not send yet.');
      } else if (p.name_status) report('ok', `Display name approved (${p.name_status})`);
      if (p.quality_rating) report(p.quality_rating === 'RED' ? 'warn' : 'ok', `Quality rating: ${p.quality_rating}`);
    }
  }

  // ── 4. OTP template ───────────────────────────────────────────────────────
  section('4. OTP message template');
  if (!env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
    report('warn', 'Template check skipped - set WHATSAPP_BUSINESS_ACCOUNT_ID to enable it',
      'WhatsApp Business Account ID: Meta app -> WhatsApp -> API Setup (under the phone number), or WhatsApp Manager -> Account tools.');
  } else if (hasToken) {
    const r = await graph(`${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?name=${encodeURIComponent(TEMPLATE)}&fields=name,status,language,category`);
    const match = (r.body?.data ?? []).filter((t: any) => t.name === TEMPLATE);
    if (!r.ok) report('fail', 'Could not read templates', r.body?.error?.message || `HTTP ${r.status}`);
    else if (match.length === 0) report('fail', `No template named "${TEMPLATE}"`, 'Create it in WhatsApp Manager (step A6).');
    else {
      const t = match.find((x: any) => x.language === TEMPLATE_LANG) ?? match[0];
      if (t.language !== TEMPLATE_LANG) report('fail', `Template has no "${TEMPLATE_LANG}" language`, `Found: ${match.map((x: any) => x.language).join(', ')}.`);
      if (t.category !== 'AUTHENTICATION') report('fail', `Template category is ${t.category}`, 'It must be AUTHENTICATION (step A6).');
      if (t.status === 'APPROVED') report('ok', `Template "${TEMPLATE}" is APPROVED`);
      else report(t.status === 'PENDING' ? 'warn' : 'fail', `Template status: ${t.status}`, t.status === 'PENDING' ? 'Waiting for Meta review.' : 'Edit/resubmit it in WhatsApp Manager (step A6).');
    }
  }

  // ── 5. Optional live test ─────────────────────────────────────────────────
  const sendIdx = process.argv.indexOf('--send');
  if (sendIdx !== -1) {
    section('5. Live test message');
    const to = normalizeIndianMobile(process.argv[sendIdx + 1]);
    if (!to) report('fail', 'Give a valid 10-digit Indian mobile after --send');
    else if (!hasId || !hasToken) report('fail', 'Cannot send - WhatsApp settings missing (section 3)');
    else {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const sent = await sendWhatsAppOtp(to, code);
      report(sent ? 'ok' : 'fail', sent ? `Sent test code ${code} to +91 ${to} - check WhatsApp on that phone` : 'Meta refused the test message (see the error above)');
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const fails = results.filter((s) => s === 'fail').length;
  const warns = results.filter((s) => s === 'warn').length;
  console.log(`\n${fails === 0 && warns === 0 ? '🎉 All set - phone login is ready.' : fails === 0 ? `Nothing broken - ${warns} thing(s) still to finish.` : `${fails} problem(s) to fix, ${warns} warning(s).`}`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
