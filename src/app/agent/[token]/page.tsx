'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderStatus, ORDER_STATUS_LABELS, VALID_STATUS_TRANSITIONS } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft,
  Lock,
  ArrowRight,
  Loader,
  Package,
  User,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';

export default function AgentUpdatePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params.token as string).toLowerCase();

  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [pin, setPin] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch order details on mount
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/agent-token/${token}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Order not found');
        const data = await response.json();
        setOrder(data);
        // Clear form state when a fresh order is fetched
        setSelectedStatus('');
        setEta('');
        setPin('');
        setResult(null);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setLoadingOrder(false);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [token]);

  // Get valid next statuses for current order status
  const validNextStatuses = order ? VALID_STATUS_TRANSITIONS[order.status] : [];

  // Effect removed - validNextStatuses is computed reactively

  // Get friendly button text based on selected status
  const getButtonText = () => {
    if (!selectedStatus) return 'Select an action';
    switch (selectedStatus) {
      case 'eta_assigned':
        return 'Assign ETA';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Mark Delivered';
      case 'cancelled':
        return 'Cancel Order';
      default:
        return 'Update Status';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || !pin) return;
    
    console.log('🔍 SUBMIT CHECK:', { selectedStatus, currentStatus: order?.status });
    
    // ABSOLUTE SAFETY CHECK: Prevent submitting same status
    if (selectedStatus === order?.status) {
      console.error('❌ CRITICAL: Attempted to submit same status!', { selectedStatus, currentStatus: order?.status });
      setResult({
        success: false,
        message: `❌ Cannot transition to the same status (${ORDER_STATUS_LABELS[order?.status || 'received']}). Please select a different action.`,
      });
      setSelectedStatus('');
      return;
    }
    
    // Verify the transition is valid
    const validTransitions = VALID_STATUS_TRANSITIONS[order?.status || 'received'];
    if (!validTransitions.includes(selectedStatus)) {
      console.error('❌ CRITICAL: Invalid transition attempted!', { from: order?.status, to: selectedStatus, validOptions: validTransitions });
      setResult({
        success: false,
        message: `Cannot transition from ${order?.status} to ${selectedStatus}. Valid actions: ${validTransitions.map(s => ORDER_STATUS_LABELS[s]).join(', ')}`,
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const payload = {
      updateToken: token,
      status: selectedStatus,
      pin,
      eta: eta || undefined,
    };

    console.log('=== FORM SUBMISSION ===');
    console.log('selectedStatus:', selectedStatus);
    console.log('order.status:', order?.status);
    console.log('Full payload:', payload);

    try {
      const response = await fetch('/api/orders/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `Order updated to "${ORDER_STATUS_LABELS[selectedStatus]}" successfully!`,
        });
        setPin('');
        setSelectedStatus('');
        setEta('');
        
        // Update order state with the response data directly
        // This avoids stale read issues from Neon read replicas
        if (data.order) {
          setOrder(prevOrder => prevOrder ? {
            ...prevOrder,
            status: data.order.status as OrderStatus,
            eta: data.order.eta || prevOrder.eta,
          } : null);
          console.log('=== ORDER UPDATED FROM RESPONSE ===');
          console.log('New status:', data.order.status);
        }
        
        // Redirect to agent dashboard after a brief delay to show success message
        setTimeout(() => {
          router.push('/agent-dashboard');
        }, 1500);
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to update order status',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading order details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Link href="/agent-dashboard" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
            <h2 className="text-lg font-semibold text-red-900">Order Not Found</h2>
            <p className="text-red-800 mt-1">The order could not be found. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  const isComplete = order.status === 'delivered' || order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/agent-dashboard" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6">
          {/* Order Summary Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{order.customerName}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  order.status === 'received' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'eta_assigned' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="space-y-3 text-gray-700">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{order.customerPhone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <div>{order.siteAddress}</div>
                    {order.landmark && <div className="text-sm text-gray-600">Landmark: {order.landmark}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Order Date</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatDate(order.createdAt)}
                </p>
                <p className="text-xs text-gray-600">{formatTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
                <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(order.total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{order.items.length}</p>
              </div>
            </div>

            {/* Items List */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Order Items:</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-gray-700">
                    <span>{item.quantity}× {item.name}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.eta && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">ETA: <strong>{order.eta}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Update Form */}
          {!isComplete ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Update Order Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {validNextStatuses.filter(status => status !== order?.status).length === 0 
                    ? 'No actions available for this order'
                    : `Available actions: ${validNextStatuses.filter(status => status !== order?.status).map(s => ORDER_STATUS_LABELS[s]).join(', ')}`}
                </p>
              </div>

              {result && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                    result.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.message}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Action
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as OrderStatus;
                      console.log('Dropdown onChange:', { newStatus, currentStatus: order?.status, equal: newStatus === order?.status });
                      
                      // Prevent selecting empty or current status
                      if (!newStatus) {
                        setSelectedStatus('');
                        return;
                      }
                      
                      if (newStatus === order?.status) {
                        console.warn('❌ User tried to select current status:', order?.status);
                        setResult({
                          success: false,
                          message: 'Cannot select the current status. Please choose a different action.',
                        });
                        return;
                      }
                      
                      // Verify the status is actually in the valid transitions
                      if (!VALID_STATUS_TRANSITIONS[order?.status || 'received'].includes(newStatus)) {
                        console.warn('❌ Invalid transition attempted:', { from: order?.status, to: newStatus });
                        setResult({
                          success: false,
                          message: `Cannot transition from ${order?.status} to ${newStatus}`,
                        });
                        return;
                      }
                      
                      setSelectedStatus(newStatus);
                      console.log('✓ Status selected:', newStatus);
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    required
                  >
                    <option value="">Select an action...</option>
                    {order && VALID_STATUS_TRANSITIONS[order.status]
                      .filter(status => status !== order.status) // Remove current status
                      .map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS_LABELS[status]}
                        </option>
                      ))}
                  </select>
                  {selectedStatus && (
                    <p className="text-xs text-gray-500 mt-1">
                      Moving from <strong>{ORDER_STATUS_LABELS[order?.status || 'received']}</strong> to <strong>{ORDER_STATUS_LABELS[selectedStatus]}</strong>
                    </p>
                  )}
                </div>

                {selectedStatus === 'eta_assigned' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Delivery Time
                    </label>
                    <input
                      type="text"
                      value={eta}
                      onChange={(e) => setEta(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="e.g., 2:30 PM - 3:00 PM"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    4-Digit PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="Enter PIN"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading || 
                    !selectedStatus || 
                    pin.length !== 4 || 
                    selectedStatus === order?.status ||
                    !VALID_STATUS_TRANSITIONS[order?.status || 'received'].includes(selectedStatus)
                  }
                  title={
                    selectedStatus === order?.status 
                      ? 'Cannot select the current status' 
                      : !selectedStatus
                      ? 'Please select an action'
                      : pin.length !== 4
                      ? 'Please enter a 4-digit PIN'
                      : 'Update order status'
                  }
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      {getButtonText()}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Order Complete</h3>
              <p className="text-gray-600 mt-2">No further actions needed for this order.</p>
              <Link 
                href="/agent-dashboard"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
