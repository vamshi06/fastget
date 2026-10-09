'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/UserContext';
import { SignInPrompt } from '@/components/SignInPrompt';
import { formatCurrency } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';
import type { ReferrerReferral, ReferralPayoutStatus } from '@/lib/db';
import { Gift, Copy, Check, Share2, ChevronRight } from 'lucide-react';

interface ReferralInfo {
  code: string;
  rewardAmount: number;
  referrals: ReferrerReferral[];
}

const STATUS_STYLES: Record<ReferralPayoutStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  to_pay: 'bg-primary-50 text-brand-primary border-primary-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-neutral-100 text-brand-slate border-neutral-200',
};

const STATUS_KEYS: Record<ReferralPayoutStatus, string> = {
  pending: 'referral.statusPending',
  to_pay: 'referral.statusToPay',
  paid: 'referral.statusPaid',
  cancelled: 'referral.statusCancelled',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReferPage() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const { currentUser, isLoaded: userIsLoaded } = useUser();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    fetch('/api/referral', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.code) setInfo(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!userIsLoaded) return null;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-brand-fog">
        <SignInPrompt Icon={Gift} title={t('menu.referAndEarn')} subtitle={t('referral.guestSubtitle')} redirect="/refer" />
      </div>
    );
  }

  const reward = formatCurrency(info?.rewardAmount ?? 200);
  const shareText = info
    ? t('referral.shareMessage', { code: info.code, link: window.location.origin })
    : '';

  const handleCopy = async () => {
    if (!info) return;
    const ok = await copyText(info.code);
    setCopyFailed(!ok);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    // Mobile app: the WebView has no navigator.share, and window.open would
    // navigate the app away to WhatsApp's site - use the native share sheet.
    const rnWebView = (window as any).ReactNativeWebView;
    if (rnWebView && typeof rnWebView.postMessage === 'function') {
      rnWebView.postMessage(JSON.stringify({ type: 'SHARE_TEXT', text: shareText }));
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch (err) {
        // User dismissed the share sheet - nothing to do.
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    // No Web Share API (desktop, some WebViews) - WhatsApp is the common case.
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  };

  return (
    <div className="min-h-screen bg-brand-fog pb-8">
      {/* native-title-dup: the app's top bar has back + title */}
      <div className="native-title-dup flex items-center gap-2 px-4 pt-6 pb-2">
        <Link href="/account" className="text-brand-primary hover:text-brand-dark transition-colors font-medium text-sm">{t('coins.breadcrumbAccount')}</Link>
        <ChevronRight className="w-4 h-4 text-brand-steel" />
        <span className="text-brand-charcoal font-medium text-sm">{t('menu.referAndEarn')}</span>
      </div>

      <div className="mx-4 mt-2 bg-brand-primary rounded-2xl p-6 text-white shadow-brand-lg">
        <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wide mb-1">
          <Gift className="w-4 h-4" />
          {t('menu.referAndEarn')}
        </div>
        <p className="text-2xl font-black">{t('referral.heading', { amount: reward })}</p>
        <p className="text-sm text-white/85 mt-1">{t('referral.subheading')}</p>
      </div>

      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
        {loading || !info ? (
          <p className="text-center text-sm text-brand-slate py-4">{tc('loading')}</p>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate">{t('referral.yourCode')}</p>
            <div className="mt-1 flex items-center gap-2">
              {/* select-all: if copying is blocked, one tap selects the whole code for a manual copy */}
              <p className="flex-1 select-all rounded-xl border border-dashed border-primary-200 bg-primary-50 px-3 py-2.5 text-xl font-black tracking-widest text-brand-charcoal">
                {info.code}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-3 rounded-xl border border-neutral-200 text-xs font-semibold text-brand-charcoal hover:bg-neutral-50 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? t('referral.copied') : t('referral.copy')}
              </button>
            </div>
            {copyFailed && <p className="text-xs text-red-600 mt-1.5">{t('referral.copyFailed')}</p>}
            <button
              type="button"
              onClick={handleShare}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {t('referral.share')}
            </button>
          </>
        )}
      </div>

      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
        <h2 className="text-sm font-bold text-brand-charcoal mb-3">{t('referral.howItWorks')}</h2>
        <ol className="space-y-2.5">
          {[t('referral.step1'), t('referral.step2'), t('referral.step3', { amount: reward })].map((step, i) => (
            <li key={i} className="flex gap-3 text-xs text-brand-charcoal leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-brand-primary font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mx-4 mt-4">
        <h2 className="text-sm font-bold text-brand-charcoal mb-2 px-1">{t('referral.yourReferrals')}</h2>
        {!info || info.referrals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 text-center text-sm text-brand-slate">
            {loading ? tc('loading') : t('referral.noReferrals')}
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 divide-y divide-neutral-100">
            {info.referrals.map((r) => (
              <div key={r.orderId} className="flex items-center px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-charcoal truncate">{r.friendFirstName || t('referral.aFriend')}</p>
                  <p className="text-xs text-brand-slate">{formatDate(r.createdAt)}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[r.payoutStatus]}`}>
                  {r.payoutStatus === 'paid' && r.payoutAmount
                    ? t('referral.statusPaidAmount', { amount: formatCurrency(r.payoutAmount) })
                    : t(STATUS_KEYS[r.payoutStatus])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
