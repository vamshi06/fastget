'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ToastContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { formatCurrency, validateOrderForm, formatPhoneNumber, estimateDeliveryTime } from '@/lib/utils';
import { MapPin, Phone, User, Clock, Calendar, AlertCircle, ChevronRight, Package, ShieldCheck, Zap, ArrowRight, ClipboardList, CreditCard, Banknote } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { state, getSubtotal, getConvenienceFee, getTotal, clearCart, isLoaded } = useCart();
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const { openCheckout } = useRazorpay();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [paymentState, setPaymentState] = useState<'idle' | 'creating' | 'processing' | 'verifying' | 'success' | 'failed'>('idle');

  // Show error redirected back from /api/payment/callback (e.g. cancelled UPI)
  useEffect(() => {
    const paymentError = searchParams.get('payment_error');
    if (paymentError) setError(decodeURIComponent(paymentError));
  }, [searchParams]);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    siteAddress: '',
    landmark: '',
    deliveryType: 'urgent' as 'urgent' | 'scheduled',
    scheduledTime: '',
  });

  if (isLoaded && !currentUser) {
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
    return (
      <div className="min-h-screen bg-brand-fog flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
            <div className="h-1 bg-brand-primary" />

            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-2xl font-black text-brand-charcoal">Almost there!</h1>
                {itemCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-primary-50 text-brand-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary-200">
                    <Package className="w-3.5 h-3.5" />
                    {itemCount} item{itemCount > 1 ? 's' : ''} in cart
                  </span>
                )}
              </div>
              <p className="text-brand-slate text-sm">Sign in to complete your order and enjoy fast delivery</p>
            </div>

            {/* Benefits */}
            <div className="px-8 py-5 space-y-3 bg-brand-fog/50">
              {[
                { icon: Zap, text: 'Urgent delivery in 30–60 minutes' },
                { icon: ClipboardList, text: 'Track your order in real time' },
                { icon: ShieldCheck, text: 'Secure account & order history' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                  <span className="text-sm text-brand-graphite">{text}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="px-8 py-6 space-y-3">
              <Link
                href="/login?redirect=/checkout"
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                Log In to Your Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signup?redirect=/checkout"
                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 text-brand-charcoal font-semibold text-sm hover:border-brand-primary hover:text-brand-primary transition-colors"
              >
                Create a New Account
              </Link>
              <p className="text-center text-xs text-brand-steel pt-1">
                Your cart is saved — it will be waiting after you sign in
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoaded && state.items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Package className="w-16 h-16 text-brand-steel mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">Your cart is empty</h1>
          <p className="text-brand-slate mb-8">Add products to your cart before checking out</p>
          <Link href="/catalog" className="btn-primary inline-flex px-6 py-3">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateOrderForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          customerPhone: formatPhoneNumber(formData.customerPhone),
          items: state.items,
          subtotal: getSubtotal(),
          convenienceFee: getConvenienceFee(),
          total: getTotal(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const data = await response.json();
      clearCart();
      router.push(`/order/${data.statusToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpayPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateOrderForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setPaymentState('creating');
    showToast('Creating order…', 'success');

    try {
      // Step 1 — create DB order + Razorpay order on the server
      const createRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerPhone: formatPhoneNumber(formData.customerPhone),
          items: state.items,
          subtotal: getSubtotal(),
          convenienceFee: getConvenienceFee(),
          total: getTotal(),
          currency: 'INR',
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || 'Failed to initiate payment');
      }

      const { razorpayOrderId, amount, currency, orderId, statusToken } = await createRes.json();

      setPaymentState('processing');

      // Step 2 — open Razorpay checkout.
      // callback_url is used instead of a JS handler so that Razorpay POSTs the
      // payment result to our server even when the user leaves the app (e.g. GPay).
      // The server verifies the payment and redirects to success or failure.
      const callbackUrl =
        `${window.location.origin}/api/payment/callback` +
        `?orderId=${encodeURIComponent(orderId)}` +
        `&statusToken=${encodeURIComponent(statusToken)}`;

      await openCheckout({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount,
        currency,
        name: 'FastGet',
        description: 'Order payment',
        order_id: razorpayOrderId,
        callback_url: callbackUrl,
        prefill: {
          name: formData.customerName,
          contact: formatPhoneNumber(formData.customerPhone),
        },
        theme: { color: '#F5A623' },
        modal: {
          ondismiss: () => {
            // Best-effort: mark the DB order cancelled so it doesn't show as "received"
            fetch('/api/payment/cancel-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId }),
            }).catch(() => {});
            setPaymentState('idle');
            setIsSubmitting(false);
            showToast('Payment was cancelled', 'error');
          },
        },
      });
      // isSubmitting stays true until ondismiss fires or the page navigates away
    } catch (err) {
      setPaymentState('failed');
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const inputCls = 'w-full px-4 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all duration-200';

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/cart" className="text-brand-primary hover:text-brand-dark transition-colors font-medium text-sm">Cart</Link>
          <ChevronRight className="w-4 h-4 text-brand-steel" />
          <span className="text-brand-charcoal font-medium text-sm">Checkout</span>
        </div>

        <h1 className="text-2xl font-black text-brand-charcoal mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={paymentMethod === 'razorpay' ? handleRazorpayPayment : handleSubmit} className="card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-primary" />
                  Contact Information
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className={inputCls}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        className={`${inputCls} pl-10`}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-primary" />
                  Delivery Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      Site Address *
                    </label>
                    <textarea
                      value={formData.siteAddress}
                      onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                      rows={3}
                      className={`${inputCls} resize-none`}
                      placeholder="Building name, street address, area, landmark"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className={inputCls}
                      placeholder="Nearby landmark for easier navigation"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-primary" />
                  Delivery Options
                </h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                        formData.deliveryType === 'urgent'
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
                        <p className="font-semibold text-brand-charcoal text-sm">Urgent (30-60 min)</p>
                        <p className="text-xs text-brand-slate">Deliver as soon as possible</p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                        formData.deliveryType === 'scheduled'
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
                        <p className="font-semibold text-brand-charcoal text-sm">Scheduled</p>
                        <p className="text-xs text-brand-slate">Choose a delivery time</p>
                      </div>
                    </label>
                  </div>

                  {formData.deliveryType === 'scheduled' && (
                    <div>
                      <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Preferred Delivery Time *
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment method selection */}
              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-primary" />
                  Payment Method
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'cod'
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
                      <Banknote className="w-4 h-4 text-brand-slate" />
                      <div>
                        <p className="font-semibold text-brand-charcoal text-sm">Cash on Delivery</p>
                        <p className="text-xs text-brand-slate">Pay when delivered</p>
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'razorpay'
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
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-brand-slate" />
                      <div>
                        <p className="font-semibold text-brand-charcoal text-sm">Pay Online</p>
                        <p className="text-xs text-brand-slate">UPI / Card / Net Banking</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? paymentState === 'creating'
                    ? 'Creating order…'
                    : paymentState === 'processing'
                    ? 'Complete payment in popup…'
                    : paymentState === 'verifying'
                    ? 'Verifying payment…'
                    : 'Placing Order…'
                  : paymentMethod === 'razorpay'
                  ? 'Proceed to Pay'
                  : 'Place Order'}
                {!isSubmitting && <ChevronRight className="w-5 h-5" />}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-bold text-brand-charcoal mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto scrollbar-thin">
                {state.items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-brand-slate">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-brand-charcoal">{formatCurrency(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>Subtotal</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>Convenience Fee (10%)</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(getConvenienceFee())}</span>
                </div>
                <div className="border-t border-neutral-100 pt-3">
                  <div className="flex justify-between font-black text-brand-charcoal">
                    <span>Total</span>
                    <span className="text-xl">{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-800 font-semibold mb-1">Payment Method</p>
                <p className="text-sm text-green-700">
                  {paymentMethod === 'razorpay' ? 'Online Payment (Razorpay)' : 'Cash on Delivery'}
                </p>
              </div>

              {formData.deliveryType === 'urgent' && (
                <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                  <p className="text-sm text-primary-700 font-semibold mb-1">Estimated Delivery</p>
                  <p className="text-sm text-primary-600">{estimateDeliveryTime()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
