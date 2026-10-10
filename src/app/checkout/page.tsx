'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCart } from '@/components/CartContext';
import { useUser } from '@/components/UserContext';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useToast } from '@/components/ToastContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { haptic } from '@/lib/native-bridge';
import { track } from '@/lib/analytics';
import { formatCurrency, validateOrderFormCode, formatPhoneNumber, estimateDeliveryTime, ORDER_FORM_ERRORS, OrderFormErrorCode } from '@/lib/utils';
import { isServiceablePincode, isValidGstin } from '@/lib/service-area';
import { MapPin, Phone, User, Clock, Calendar, AlertCircle, ChevronRight, Package, ShieldCheck, Zap, ArrowRight, ClipboardList, Home, Briefcase, MoreHorizontal, ChevronDown, ChevronUp, PenLine, Wallet, Banknote, Coins, Tag, Gift, ShoppingBag, LocateFixed, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { UserAddress, AddressType, PaymentMethod } from '@/types';

const ADDRESS_TYPE_ICONS: Record<AddressType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  work: Briefcase,
  other: MoreHorizontal,
};

// Scheduled delivery: 2-hour slots, today + the next two days. A slot can be
// booked until DELIVERY lead time before it starts.
const SLOT_START_HOURS = [8, 10, 12, 14, 16, 18];
const SLOT_LEAD_MINUTES = 60;
const SLOT_DAYS = 3;

function slotStart(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function isSlotOpen(dayOffset: number, hour: number): boolean {
  return slotStart(dayOffset, hour).getTime() - Date.now() >= SLOT_LEAD_MINUTES * 60000;
}

function formatSlotHour(hour: number): string {
  return slotStart(0, hour).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });
}

function CheckoutPageContent() {
  const router = useRouter();
  const t = useTranslations('checkout');
  const tc = useTranslations('common');
  const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
    home: t('addressTypes.home'),
    work: t('addressTypes.work'),
    other: t('addressTypes.other'),
  };
  const {
    state,
    getSubtotal,
    getConvenienceFee,
    getTotal,
    clearCart,
    isLoaded,
    getLineBreakdown,
    coinBalance,
    redeemCoins,
    setRedeemCoins,
    coinsToRedeem,
    setCoinsToRedeem,
  } = useCart();
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const { openCheckout } = useRazorpay();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'verifying' | 'failed'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  // Validation codes (ours or echoed back by the API) are shown in the
  // customer's language; anything else is shown as the server sent it.
  const localizeError = (message: string) => {
    const code = (Object.keys(ORDER_FORM_ERRORS) as OrderFormErrorCode[]).find((c) => ORDER_FORM_ERRORS[c] === message);
    return code ? t(`errors.${code}`) : message;
  };
  const errorRef = useRef<HTMLDivElement>(null);

  const [firstOrderEligible, setFirstOrderEligible] = useState(false);
  const [firstOrderDiscountAmount, setFirstOrderDiscountAmount] = useState(200);
  const [firstOrderMinOrder, setFirstOrderMinOrder] = useState(449);

  // Display-only preview of the first-order coupon - the server always
  // recomputes and re-validates this from scratch in priceOrderFromCatalog.
  const firstOrderDiscount =
    firstOrderEligible && getTotal() >= firstOrderMinOrder
      ? Math.min(firstOrderDiscountAmount, getTotal())
      : 0;

  // How many coins can actually be applied - capped by both balance and the
  // order's own value after the coupon (server re-validates both; this is
  // just for display).
  const maxRedeemable = Math.min(coinBalance, getTotal() - firstOrderDiscount);
  const coinDiscount = redeemCoins ? Math.min(coinsToRedeem, maxRedeemable) : 0;

  // Friend's referral code - doesn't change the price, it's recorded on the
  // order so the referrer can be paid once it's delivered. The order APIs
  // re-validate it; this Apply step is just early feedback.
  const [referralInput, setReferralInput] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [applyingReferral, setApplyingReferral] = useState(false);

  const handleApplyReferral = async () => {
    const code = referralInput.trim();
    if (!code) return;
    setApplyingReferral(true);
    setReferralError(null);
    try {
      const res = await fetch('/api/referral/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedReferral(data.code);
      } else {
        setReferralError(data.error || t('referralInvalid'));
      }
    } catch {
      setReferralError(t('referralInvalid'));
    } finally {
      setApplyingReferral(false);
    }
  };

  // Show error redirected back from /api/payment/callback (e.g. cancelled UPI)
  useEffect(() => {
    const paymentError = searchParams.get('payment_error');
    if (paymentError) setError(decodeURIComponent(paymentError));
  }, [searchParams]);

  // The error banner renders above the form, but the user is often scrolled
  // down (e.g. mid-form when the Razorpay modal is dismissed) - scroll it
  // into view so a new error is never silently off-screen. The site header
  // is `sticky top-0`, so a plain scrollIntoView lands the banner right
  // under it, hidden - offset by the header's real height instead.
  useEffect(() => {
    if (!error || !errorRef.current) return;
    const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    const top = errorRef.current.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [error]);

  // Every error the customer sees here (validation, payment, server) - the
  // most direct answer to "why did they leave at checkout?".
  useEffect(() => {
    if (error) track('checkout_error', { message: error, payment_method: paymentMethod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Funnel step, once per visit: reached checkout, or hit the sign-in wall.
  const arrivalTracked = useRef(false);
  useEffect(() => {
    if (!isLoaded || arrivalTracked.current) return;
    arrivalTracked.current = true;
    if (!currentUser) track('checkout_login_required', { item_count: state.items.length });
    else if (state.items.length > 0) {
      track('checkout_started', { item_count: state.items.length, cart_value: getTotal() });
    }
  }, [isLoaded, currentUser, state.items.length, getTotal]);

  // Name and phone default to the account's - most people order for themselves.
  const [useAccountName, setUseAccountName] = useState(true);
  const [useAccountPhone, setUseAccountPhone] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [newAddressCity, setNewAddressCity] = useState('');
  const [newAddressType, setNewAddressType] = useState<AddressType>('home');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    siteAddress: '',
    landmark: '',
    sitePincode: '',
    deliveryType: 'urgent' as 'urgent' | 'scheduled',
    scheduledTime: '',
  });

  // Optional pin from "Use my current location" - sent with the order so the
  // delivery team can open the exact site in Maps.
  const [sitePin, setSitePin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleUseLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError(t('locationUnavailable'));
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSitePin({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) });
        setLocating(false);
      },
      (err) => {
        setLocationError(err.code === err.PERMISSION_DENIED ? t('locationDenied') : t('locationUnavailable'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  // Optional GST details for a GST invoice.
  const [showGst, setShowGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');

  // Scheduled delivery slot picker.
  const [slotDay, setSlotDay] = useState(0);

  const pincodeOk = isServiceablePincode(formData.sitePincode);

  // Prefill name + phone from the account once it's known.
  useEffect(() => {
    if (!currentUser) return;
    setFormData(prev => ({
      ...prev,
      customerName: prev.customerName || currentUser.name || '',
      customerPhone: prev.customerPhone || formatPhoneNumber(currentUser.phone || ''),
    }));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseAccountName = (checked: boolean) => {
    setUseAccountName(checked);
    setFormData(prev => ({
      ...prev,
      customerName: checked && currentUser ? currentUser.name : '',
    }));
  };

  const handleUseAccountPhone = (checked: boolean) => {
    setUseAccountPhone(checked);
    setFormData(prev => ({
      ...prev,
      customerPhone: checked && currentUser?.phone ? currentUser.phone : '',
    }));
  };

  // Manual entry fields are shown whenever there's no selected saved address -
  // not just when the user explicitly clicked "Enter a different address" -
  // e.g. a brand-new user with zero saved addresses never sets manualEntry
  // but still types a fresh address into these fields.
  const isManualEntryActive = !selectedAddress || manualEntry;

  const applyAddress = (addr: UserAddress) => {
    setSelectedAddress(addr);
    setShowAddressPicker(false);
    setManualEntry(false);
    setFormData(prev => ({
      ...prev,
      siteAddress: addr.landmark ? `${addr.street}, ${addr.city}` : `${addr.street}, ${addr.city}`,
      landmark: addr.landmark ?? '',
      sitePincode: addr.pincode || prev.sitePincode,
      customerPhone: prev.customerPhone || addr.phone,
    }));
  };

  // Fetch whether the user still qualifies for the first-order coupon.
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/orders/first-order-eligibility', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.eligible === 'boolean') setFirstOrderEligible(data.eligible);
        if (typeof data.discountAmount === 'number') setFirstOrderDiscountAmount(data.discountAmount);
        if (typeof data.minOrderValue === 'number') setFirstOrderMinOrder(data.minOrderValue);
      })
      .catch(() => {});
  }, [currentUser]);

  // Fetch saved addresses and auto-fill from primary on mount
  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/addresses?userId=${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        const addrs: UserAddress[] = data.addresses ?? [];
        setSavedAddresses(addrs);
        const primary = addrs.find(a => a.isPrimary) ?? addrs[0];
        if (primary) applyAddress(primary);
        else setSaveAddress(true); // no saved addresses yet - default to saving this one
      })
      .catch(() => { });
    // applyAddress is stable - no deps needed beyond currentUser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (isLoaded && !currentUser) {
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
    // Same light sign-in card as Account / Orders (no full-screen photo).
    return (
      <div className="min-h-screen bg-brand-fog">
        <SignInPrompt
          Icon={ShoppingBag}
          title={t('guestTitle')}
          subtitle={t('guestSubtitle')}
          redirect="/checkout"
          badge={itemCount > 0 ? (<><Package className="w-3.5 h-3.5" />{t('itemsInCartBadge', { count: itemCount })}</>) : undefined}
          benefits={[t('benefitUrgentDelivery'), t('benefitTrackOrder'), t('benefitSecureAccount')]}
          footnote={t('cartSavedNote')}
        />
      </div>
    );
  }

  if (isLoaded && state.items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Package className="w-16 h-16 text-brand-steel mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">{t('emptyTitle')}</h1>
          <p className="text-brand-slate mb-8">{t('emptyMessage')}</p>
          <Link href="/catalog" className="btn-primary inline-flex px-6 py-3">
            {tc('browseProducts')}
          </Link>
        </div>
      </div>
    );
  }

  // Best-effort save of the address entered/edited during checkout - shared
  // by both the COD and Razorpay success paths.
  const persistAddressIfRequested = async () => {
    if (!(isManualEntryActive && saveAddress)) return;
    try {
      await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newAddressType,
          street: formData.siteAddress,
          city: newAddressCity,
          pincode: formData.sitePincode,
          phone: formatPhoneNumber(formData.customerPhone),
          landmark: formData.landmark || undefined,
          isPrimary: savedAddresses.length === 0,
        }),
      });
    } catch {
      // Address save is best-effort - don't block order confirmation on it
    }
  };

  // Form fields + site extras, as sent to /api/orders and /api/payment/create-order.
  const orderFields = () => ({
    ...formData,
    customerPhone: formatPhoneNumber(formData.customerPhone),
    siteLat: sitePin?.lat,
    siteLng: sitePin?.lng,
    gstin: showGst && gstin.trim() ? gstin.trim().toUpperCase() : undefined,
    businessName: showGst && gstin.trim() ? businessName.trim() || undefined : undefined,
  });

  const trackOrderPlaced = (method: PaymentMethod) => {
    track('order_placed', {
      payment_method: method,
      total: getTotal() - firstOrderDiscount - coinDiscount,
      item_count: state.items.length,
      delivery_type: formData.deliveryType,
      first_order_discount: firstOrderDiscount,
      coins_used: coinDiscount,
      referral_applied: Boolean(appliedReferral),
    });
  };

  const handlePlaceCodOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderFields(),
          items: state.items,
          subtotal: getSubtotal(),
          convenienceFee: getConvenienceFee(),
          total: getTotal() - firstOrderDiscount - coinDiscount,
          coinsToRedeem: coinDiscount,
          referralCode: appliedReferral || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.statusToken) {
        haptic('success');
        trackOrderPlaced('cod');
        await persistAddressIfRequested();
        clearCart();
        router.push(`/order/${data.statusToken}`);
      } else {
        setIsSubmitting(false);
        const msg = data.error ? localizeError(data.error) : t('errorPlaceOrderFailed');
        setError(msg);
        showToast(msg, 'error');
      }
    } catch {
      setIsSubmitting(false);
      const msg = t('errorPlaceOrderGeneric');
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fields = orderFields();
    const validationError = validateOrderFormCode(fields);
    if (validationError) {
      setError(t(`errors.${validationError}`));
      return;
    }

    if (isManualEntryActive && saveAddress && !newAddressCity.trim()) {
      setError(t('errorEnterCity'));
      return;
    }

    if (paymentMethod === 'cod') {
      await handlePlaceCodOrder();
      return;
    }

    if (firstOrderDiscount + coinDiscount >= getTotal()) {
      setError(t('errorFullyCovered'));
      return;
    }

    setIsSubmitting(true);
    setPaymentState('processing');

    try {
      // Step 1 - validate, reprice, and get a Razorpay order + signed orderToken
      const createRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderFields(),
          items: state.items,
          subtotal: getSubtotal(),
          convenienceFee: getConvenienceFee(),
          total: getTotal() - firstOrderDiscount - coinDiscount,
          coinsToRedeem: coinDiscount,
          referralCode: appliedReferral || undefined,
          currency: 'INR',
          userId: currentUser?.id,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error ? localizeError(data.error) : t('errorInitiatePayment'));
      }

      const { razorpayOrderId, amount, currency, orderToken } = await createRes.json();
      track('payment_opened', { amount: amount / 100 });

      // Step 2 - open Razorpay checkout.
      await openCheckout({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount,
        currency,
        name: 'FastGet',
        description: 'Order payment',
        order_id: razorpayOrderId,
        handler: async (response) => {
          setPaymentState('verifying');
          try {
            const verifyRes = await fetch('/api/payment/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderToken,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.statusToken) {
              haptic('success');
              trackOrderPlaced('razorpay');
              await persistAddressIfRequested();
              clearCart();
              router.push(`/order/${verifyData.statusToken}`);
            } else {
              track('payment_failed', { stage: 'verify', status: verifyRes.status });
              setPaymentState('failed');
              setIsSubmitting(false);
              setError(verifyData.error || t('errorPaymentVerificationFailed'));
            }
          } catch {
            track('payment_failed', { stage: 'verify_network' });
            setPaymentState('failed');
            setIsSubmitting(false);
            setError(t('errorPaymentVerificationFailed'));
          }
        },
        prefill: {
          name: formData.customerName,
          contact: formatPhoneNumber(formData.customerPhone),
        },
        theme: { color: '#F5A623' },
        modal: {
          ondismiss: () => {
            track('payment_dismissed');
            setPaymentState('idle');
            setIsSubmitting(false);
            setError(t('errorPaymentNotCompleted'));
          },
        },
      });
      // isSubmitting stays true until ondismiss fires or the page navigates away
    } catch (err) {
      setPaymentState('failed');
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : t('errorGeneric');
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const payableTotal = getTotal() - firstOrderDiscount - coinDiscount;

  // The total is on the button itself, so it's visible at the moment of paying.
  const submitButton = (className: string) => (
    <button
      type="submit"
      form="checkout-form"
      disabled={isSubmitting}
      className={`btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isSubmitting
        ? paymentMethod === 'cod'
          ? t('placingOrder')
          : paymentState === 'processing'
            ? t('completePaymentPopup')
            : paymentState === 'verifying'
              ? t('verifyingPayment')
              : t('initiatingPayment')
        : paymentMethod === 'cod'
          ? t('placeOrderWithTotal', { total: formatCurrency(payableTotal) })
          : t('payWithTotal', { total: formatCurrency(payableTotal) })}
      {!isSubmitting && <ChevronRight className="w-5 h-5" />}
    </button>
  );

  const inputCls = 'w-full px-4 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all duration-200';

  return (
    // pb-28 on phones keeps the summary clear of the pinned order bar.
    <div className="min-h-screen bg-brand-fog pt-4 pb-28 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* native-title-dup: the app's top bar already has back + title */}
        <div className="native-title-dup flex items-center gap-2 mb-4 md:mb-8">
          <Link href="/cart" className="text-brand-primary hover:text-brand-dark transition-colors font-medium text-sm">{t('breadcrumbCart')}</Link>
          <ChevronRight className="w-4 h-4 text-brand-steel" />
          <span className="text-brand-charcoal font-medium text-sm">{t('pageTitle')}</span>
        </div>

        <h1 className="native-title-dup text-xl md:text-2xl font-black text-brand-charcoal mb-4 md:mb-8">{t('pageTitle')}</h1>

        {error && (
          <div ref={errorRef} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 min-w-0">
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-primary" />
                  {t('contactInfo')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      {t('fullNameLabel')}
                    </label>
                    {currentUser && (
                      <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useAccountName}
                          onChange={(e) => handleUseAccountName(e.target.checked)}
                          className="w-3.5 h-3.5 accent-brand-primary"
                        />
                        <span className="text-xs text-brand-slate">{t('useAccountName', { name: currentUser.name })}</span>
                      </label>
                    )}
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (useAccountName && value !== currentUser?.name) setUseAccountName(false);
                        setFormData({ ...formData, customerName: value });
                      }}
                      className={inputCls}
                      placeholder={t('namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      {t('phoneLabel')}
                    </label>
                    {currentUser?.phone && (
                      <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useAccountPhone}
                          onChange={(e) => handleUseAccountPhone(e.target.checked)}
                          className="w-3.5 h-3.5 accent-brand-primary"
                        />
                        <span className="text-xs text-brand-slate">{t('useAccountPhone', { phone: currentUser.phone })}</span>
                      </label>
                    )}
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          if (useAccountPhone && value !== currentUser?.phone) setUseAccountPhone(false);
                          setFormData({ ...formData, customerPhone: value });
                        }}
                        className={`${inputCls} pl-10`}
                        placeholder={t('phonePlaceholder')}
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-primary" />
                  {t('deliveryAddress')}
                </h2>

                {/* Selected address card */}
                {!isManualEntryActive && selectedAddress ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-primary-50 border border-brand-primary rounded-xl">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        {(() => { const Icon = ADDRESS_TYPE_ICONS[selectedAddress.type]; return <Icon className="w-4 h-4 text-brand-primary" />; })()}
                      </div>
                      <div className="ph-no-capture flex-1 min-w-0">
                        <p className="text-xs font-bold text-brand-primary uppercase tracking-wide mb-0.5">
                          {ADDRESS_TYPE_LABELS[selectedAddress.type]}
                        </p>
                        <p className="text-sm font-medium text-brand-charcoal leading-snug">{selectedAddress.street}</p>
                        {selectedAddress.landmark && (
                          <p className="text-xs text-brand-slate mt-0.5">{t('nearLandmark', { landmark: selectedAddress.landmark })}</p>
                        )}
                        <p className="text-sm text-brand-slate">{selectedAddress.city}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddressPicker(p => !p)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-dark transition-colors flex-shrink-0 mt-0.5"
                      >
                        {t('change')}
                        {showAddressPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Address picker */}
                    {showAddressPicker && (
                      <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
                        {savedAddresses.map(addr => {
                          const Icon = ADDRESS_TYPE_ICONS[addr.type];
                          const isActive = addr.id === selectedAddress.id;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => applyAddress(addr)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-primary-50' : 'bg-white hover:bg-neutral-50'}`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-brand-primary' : 'bg-neutral-100'}`}>
                                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-brand-slate'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-brand-charcoal">{ADDRESS_TYPE_LABELS[addr.type]}{addr.isPrimary && <span className="ml-1.5 text-brand-primary">· {t('primaryBadge')}</span>}</p>
                                <p className="ph-no-capture text-xs text-brand-slate truncate">{addr.street}, {addr.city}</p>
                              </div>
                              {isActive && <ChevronRight className="w-4 h-4 text-brand-primary flex-shrink-0" />}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => { setManualEntry(true); setShowAddressPicker(false); setSelectedAddress(null); setFormData(p => ({ ...p, siteAddress: '', landmark: '' })); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white hover:bg-neutral-50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                            <PenLine className="w-3.5 h-3.5 text-brand-slate" />
                          </div>
                          <span className="text-xs font-semibold text-brand-slate">{t('enterDifferentAddress')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual entry fields */
                  <div className="space-y-4">
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { const primary = savedAddresses.find(a => a.isPrimary) ?? savedAddresses[0]; applyAddress(primary); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:text-brand-dark transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {t('useSavedAddress')}
                      </button>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                        {t('siteAddressLabel')}
                      </label>
                      <textarea
                        value={formData.siteAddress}
                        onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                        rows={3}
                        className={`${inputCls} resize-none`}
                        placeholder={t('siteAddressPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                        {t('landmarkLabel')}
                      </label>
                      <input
                        type="text"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        className={inputCls}
                        placeholder={t('landmarkPlaceholder')}
                      />
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="w-3.5 h-3.5 accent-brand-primary"
                        />
                        <span className="text-xs font-semibold text-brand-charcoal">{t('saveAddressLabel')}</span>
                      </label>

                      {saveAddress && (
                        <div className="mt-3 space-y-3 pl-1">
                          <div className="flex gap-2">
                            {(['home', 'work', 'other'] as AddressType[]).map((type) => {
                              const Icon = ADDRESS_TYPE_ICONS[type];
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setNewAddressType(type)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                    newAddressType === type
                                      ? 'bg-brand-primary text-white border-brand-primary'
                                      : 'bg-white text-brand-slate border-neutral-200 hover:border-brand-primary hover:text-brand-primary'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {ADDRESS_TYPE_LABELS[type]}
                                </button>
                              );
                            })}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                              {t('cityLabel')}
                            </label>
                            <input
                              type="text"
                              value={newAddressCity}
                              onChange={(e) => setNewAddressCity(e.target.value)}
                              className={inputCls}
                              placeholder={t('cityPlaceholder')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pincode (checked against the service area) + optional map pin */}
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sitePincode" className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      {t('pincodeLabel')}
                    </label>
                    <input
                      id="sitePincode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      value={formData.sitePincode}
                      onChange={(e) => setFormData({ ...formData, sitePincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className={inputCls}
                      placeholder={t('pincodePlaceholder')}
                    />
                    {formData.sitePincode.length === 6 && (
                      pincodeOk ? (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('pincodeServiceable')}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs font-medium text-red-600">{t('errors.pincodeNotServed')}</p>
                      )
                    )}
                  </div>
                  <div>
                    <span className="hidden sm:block text-xs font-semibold mb-1.5 invisible" aria-hidden="true">-</span>
                    {sitePin ? (
                      <div className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50">
                        <a
                          href={`https://maps.google.com/?q=${sitePin.lat},${sitePin.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-medium text-green-800"
                        >
                          <LocateFixed className="w-4 h-4" />
                          {t('locationAdded')}
                        </a>
                        <button type="button" onClick={() => setSitePin(null)} className="text-xs font-semibold text-brand-slate hover:text-red-600">
                          {t('locationRemove')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUseLocation}
                        disabled={locating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-brand-primary/40 text-sm font-semibold text-brand-primary hover:bg-primary-50 transition-colors disabled:opacity-60"
                      >
                        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                        {locating ? t('locating') : t('useCurrentLocation')}
                      </button>
                    )}
                    <p className={`mt-1.5 text-xs ${locationError ? 'text-red-600' : 'text-brand-steel'}`}>
                      {locationError ?? t('locationHint')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-primary" />
                  {t('deliveryOptions')}
                </h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${formData.deliveryType === 'urgent'
                          ? 'border-brand-primary bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="deliveryType"
                        value="urgent"
                        checked={formData.deliveryType === 'urgent'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as 'urgent' })}
                        className="w-4 h-4 accent-brand-primary"
                      />
                      <div>
                        <p className="font-semibold text-brand-charcoal text-sm">{t('urgentTitle')}</p>
                        <p className="text-xs text-brand-slate">{t('urgentDesc')}</p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${formData.deliveryType === 'scheduled'
                          ? 'border-brand-primary bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="deliveryType"
                        value="scheduled"
                        checked={formData.deliveryType === 'scheduled'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as 'scheduled' })}
                        className="w-4 h-4 accent-brand-primary"
                      />
                      <div>
                        <p className="font-semibold text-brand-charcoal text-sm">{t('scheduledTitle')}</p>
                        <p className="text-xs text-brand-slate">{t('scheduledDesc')}</p>
                      </div>
                    </label>
                  </div>

                  {formData.deliveryType === 'scheduled' && (
                    <div>
                      <p className="text-xs font-semibold text-brand-graphite mb-2 uppercase tracking-wide flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('preferredDeliveryTime')}
                      </p>
                      <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar">
                        {Array.from({ length: SLOT_DAYS }).map((_, day) => {
                          const label = day === 0
                            ? t('slotDayToday')
                            : day === 1
                              ? t('slotDayTomorrow')
                              : slotStart(day, 0).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setSlotDay(day)}
                              className={`shrink-0 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                                slotDay === day
                                  ? 'bg-brand-charcoal text-white border-brand-charcoal'
                                  : 'bg-white text-brand-graphite border-neutral-200 hover:border-brand-primary'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {SLOT_START_HOURS.some((h) => isSlotOpen(slotDay, h)) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SLOT_START_HOURS.map((hour) => {
                            const open = isSlotOpen(slotDay, hour);
                            const value = slotStart(slotDay, hour).toISOString();
                            const active = formData.scheduledTime === value;
                            return (
                              <button
                                key={hour}
                                type="button"
                                disabled={!open}
                                onClick={() => setFormData({ ...formData, scheduledTime: value })}
                                className={`py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                                  active
                                    ? 'bg-primary-50 border-brand-primary text-brand-charcoal font-semibold'
                                    : 'bg-white border-neutral-200 text-brand-graphite hover:border-brand-primary'
                                }`}
                              >
                                {formatSlotHour(hour)} – {formatSlotHour(hour + 2)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-brand-slate">{t('noSlotsLeft')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Optional GST details - printed on the invoice */}
              <div className="border-t border-neutral-100 pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showGst}
                    onChange={(e) => setShowGst(e.target.checked)}
                    className="w-4 h-4 accent-brand-primary"
                  />
                  <FileText className="w-4 h-4 text-brand-primary" />
                  <span className="text-sm font-semibold text-brand-charcoal">{t('gstToggle')}</span>
                </label>
                {showGst && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="gstin" className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                        {t('gstinLabel')}
                      </label>
                      <input
                        id="gstin"
                        type="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15))}
                        className={`${inputCls} uppercase tracking-wider`}
                        placeholder={t('gstinPlaceholder')}
                      />
                      {gstin.length === 15 && !isValidGstin(gstin) && (
                        <p className="mt-1.5 text-xs font-medium text-red-600">{t('errors.gstinInvalid')}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="businessName" className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                        {t('businessNameLabel')}
                      </label>
                      <input
                        id="businessName"
                        type="text"
                        maxLength={200}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className={inputCls}
                        placeholder={t('businessNamePlaceholder')}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-brand-primary" />
                  {t('paymentMethod')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'razorpay'
                        ? 'border-brand-primary bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      className="w-4 h-4 accent-brand-primary"
                    />
                    <div>
                      <p className="font-semibold text-brand-charcoal text-sm">{t('onlinePaymentTitle')}</p>
                      <p className="text-xs text-brand-slate">{t('onlinePaymentDesc')}</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'cod'
                        ? 'border-brand-primary bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="w-4 h-4 accent-brand-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-brand-slate flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-brand-charcoal text-sm">{t('codTitle')}</p>
                        <p className="text-xs text-brand-slate">{t('codDesc')}</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Phones use the pinned bar at the bottom of the screen instead. */}
              <div className="hidden md:block">{submitButton('w-full py-3')}</div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 min-w-0">
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-bold text-brand-charcoal mb-4">{t('orderSummary')}</h2>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto scrollbar-thin">
                {state.items.map((item) => {
                  const b = getLineBreakdown(item);
                  return (
                    <div key={item.product.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-brand-slate">
                        {item.product.name} × {item.quantity}
                        {/* Flash + regular-price units on one line - show the split */}
                        {b.saleQty > 0 && b.regularQty > 0 && (
                          <span className="block text-[11px] text-amber-700">
                            {b.saleQty} × {formatCurrency(b.saleUnit)} + {b.regularQty} × {formatCurrency(b.regularUnit)}
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-brand-charcoal">{formatCurrency(b.total)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>{t('subtotal')}</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(getSubtotal())}</span>
                </div>

                {firstOrderEligible && (
                  <div className="flex items-start gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl">
                    <Tag className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
                    {firstOrderDiscount > 0 ? (
                      <p className="text-xs text-brand-charcoal">
                        <span className="font-bold">{t('firstOrderCouponApplied')}</span> {t('firstOrderCouponOff', { amount: formatCurrency(firstOrderDiscountAmount) })}
                      </p>
                    ) : (
                      <p className="text-xs text-brand-charcoal">
                        {t('firstOrderUnlockHint', {
                          amount: formatCurrency(Math.max(0, firstOrderMinOrder - getTotal())),
                          discount: formatCurrency(firstOrderDiscountAmount),
                        })}
                      </p>
                    )}
                  </div>
                )}

                {firstOrderDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>{t('firstOrderDiscount')}</span>
                    <span className="font-medium">−{formatCurrency(firstOrderDiscount)}</span>
                  </div>
                )}

                {maxRedeemable > 0 && (
                  <div className="border-t border-neutral-100 pt-3 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <span className="flex items-center gap-1.5 text-sm text-brand-charcoal font-medium">
                        <Coins className="w-4 h-4 text-brand-primary" />
                        {t('useCoins', { balance: coinBalance })}
                      </span>
                      <input
                        type="checkbox"
                        checked={redeemCoins}
                        onChange={(e) => {
                          setRedeemCoins(e.target.checked);
                          if (e.target.checked) setCoinsToRedeem(maxRedeemable);
                        }}
                        className="w-4 h-4 accent-brand-primary"
                      />
                    </label>
                    {redeemCoins && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemable}
                          value={coinsToRedeem}
                          onChange={(e) => {
                            const v = Math.round(Number(e.target.value) || 0);
                            setCoinsToRedeem(Math.max(0, Math.min(maxRedeemable, v)));
                          }}
                          className="w-24 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                        />
                        <span className="text-xs text-brand-slate">{t('coinsHint', { amount: formatCurrency(coinDiscount), max: maxRedeemable })}</span>
                      </div>
                    )}
                  </div>
                )}

                {coinDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>{t('coinsDiscount')}</span>
                    <span className="font-medium">−{formatCurrency(coinDiscount)}</span>
                  </div>
                )}

                <div className="border-t border-neutral-100 pt-3">
                  <p className="flex items-center gap-1.5 text-sm text-brand-charcoal font-medium mb-2">
                    <Gift className="w-4 h-4 text-brand-primary" />
                    {t('referralLabel')}
                  </p>
                  {appliedReferral ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-xs text-green-800">
                        <span className="font-bold tracking-wider">{appliedReferral}</span> {t('referralApplied')}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setAppliedReferral(null); setReferralInput(''); }}
                        className="text-xs font-semibold text-brand-slate hover:text-red-600 transition-colors"
                      >
                        {t('referralRemove')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={referralInput}
                          onChange={(e) => {
                            setReferralInput(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16));
                            setReferralError(null);
                          }}
                          placeholder={t('referralPlaceholder')}
                          autoCapitalize="characters"
                          autoComplete="off"
                          className="flex-1 min-w-0 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-sm text-brand-charcoal uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={handleApplyReferral}
                          disabled={!referralInput.trim() || applyingReferral}
                          className="px-3 py-1.5 rounded-lg bg-brand-charcoal text-white text-xs font-bold disabled:opacity-40 transition-opacity"
                        >
                          {applyingReferral ? '…' : t('referralApply')}
                        </button>
                      </div>
                      {referralError && <p className="text-xs text-red-600 mt-1.5">{referralError}</p>}
                    </>
                  )}
                </div>

                <div className="border-t border-neutral-100 pt-3">
                  <div className="flex justify-between font-black text-brand-charcoal">
                    <span>{t('total')}</span>
                    <span className="text-xl">{formatCurrency(getTotal() - firstOrderDiscount - coinDiscount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-800 font-semibold mb-1">{t('paymentMethod')}</p>
                <p className="text-sm text-green-700">
                  {paymentMethod === 'cod' ? t('paymentMethodValueCod') : t('paymentMethodValueOnline')}
                </p>
              </div>

              {formData.deliveryType === 'urgent' && (
                <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                  <p className="text-sm text-primary-700 font-semibold mb-1">{t('estimatedDelivery')}</p>
                  <p className="text-sm text-primary-600">{t('estimatedDeliveryBy', { time: estimateDeliveryTime() })}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pinned order bar (phones) ── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-neutral-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {submitButton('w-full h-12 text-base')}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageContent />
    </Suspense>
  );
}

