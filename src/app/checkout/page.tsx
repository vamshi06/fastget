'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { formatCurrency, validateOrderForm, formatPhoneNumber, estimateDeliveryTime } from '@/lib/utils';
import { MapPin, Phone, User, Clock, Calendar, AlertCircle, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { state, getSubtotal, getConvenienceFee, getTotal, clearCart, isLoaded } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    siteAddress: '',
    landmark: '',
    deliveryType: 'urgent' as 'urgent' | 'scheduled',
    scheduledTime: '',
  });

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
            <form onSubmit={handleSubmit} className="card p-6 space-y-6">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
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
                <p className="text-sm text-green-700">Cash on Delivery</p>
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
