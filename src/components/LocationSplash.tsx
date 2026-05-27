'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, X, ArrowRight, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVICE_AREAS, type AreaId } from './LocationSplashContext';

// Mumbai pincode → area mapping
const PINCODE_MAP: Record<string, AreaId> = {
  '400053': 'andheri',
  '400058': 'andheri',
  '400059': 'andheri',
  '400061': 'andheri',
  '400069': 'andheri',
  '400062': 'goregaon',
  '400063': 'goregaon',
  '400065': 'goregaon',
  '400064': 'malad',
  '400095': 'malad',
  '400097': 'malad',
};

type PincodeStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface Props {
  initialSelected: string | null;
  onConfirm: (area: string) => void;
  onClose: () => void;
}

export function LocationSplash({ initialSelected, onConfirm, onClose }: Props) {
  const [visible, setVisible]           = useState(false);
  const [closing, setClosing]           = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(initialSelected);
  const [pincode, setPincode]           = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>('idle');
  const [pincodeArea, setPincodeArea]   = useState<AreaId | null>(null);

  const modalRef      = useRef<HTMLDivElement>(null);
  const closeRef      = useRef<HTMLButtonElement>(null);
  const pincodeRef    = useRef<HTMLInputElement>(null);

  // Animate in on next frame
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Focus close button on open
  useEffect(() => {
    if (visible) closeRef.current?.focus();
  }, [visible]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const startClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') startClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [startClose]);

  // Focus trap
  useEffect(() => {
    if (!visible) return;
    const modal = modalRef.current;
    if (!modal) return;

    const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!nodes.length) return;
      const first = nodes[0];
      const last  = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [visible]);

  const activeSelection = selectedArea || pincodeArea;

  const getAreaName = (id: string) =>
    SERVICE_AREAS.find(a => a.id === id)?.name ?? id;

  const handleCardSelect = (id: string) => {
    setSelectedArea(id);
    setPincodeStatus('idle');
    setPincodeArea(null);
    setPincode('');
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    if (pincodeStatus !== 'idle') {
      setPincodeStatus('idle');
      setPincodeArea(null);
    }
    if (val.length > 0) setSelectedArea(null);
  };

  const handlePincodeCheck = useCallback(() => {
    if (pincode.length !== 6) return;
    setPincodeStatus('checking');
    setTimeout(() => {
      const area = PINCODE_MAP[pincode] ?? null;
      if (area) {
        setPincodeStatus('valid');
        setPincodeArea(area);
        setSelectedArea(null);
      } else {
        setPincodeStatus('invalid');
        setPincodeArea(null);
      }
    }, 450);
  }, [pincode]);

  const handlePincodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pincode.length === 6) handlePincodeCheck();
  };

  const handleConfirm = useCallback(() => {
    if (!activeSelection) return;
    onConfirm(activeSelection);
    startClose();
  }, [activeSelection, onConfirm, startClose]);

  // ──────────────────────────────────────────────────────────────────
  const isOpen   = visible && !closing;
  const ctaReady = !!activeSelection;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      className={cn(
        'fixed inset-0 z-[200] flex items-end sm:items-center justify-center',
        'transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* ── Backdrop ─────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={startClose}
        className="absolute inset-0 bg-brand-charcoal/75 backdrop-blur-[3px]"
      />

      {/* ── Modal shell ─────────────────────────────────────── */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white w-full sm:max-w-md',
          'rounded-t-[1.75rem] sm:rounded-2xl',
          'shadow-2xl',
          'transition-transform duration-300 ease-out',
          // Mobile: slide up; Desktop: scale
          isOpen
            ? 'translate-y-0 sm:scale-100'
            : 'translate-y-full sm:translate-y-0 sm:scale-95',
        )}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-neutral-200" />
        </div>

        {/* Close button */}
        <button
          ref={closeRef}
          onClick={startClose}
          aria-label="Close location selector"
          className={cn(
            'absolute top-4 right-4',
            'w-8 h-8 flex items-center justify-center',
            'rounded-full bg-neutral-100 text-brand-graphite',
            'hover:bg-neutral-200 active:scale-90',
            'transition-all duration-150',
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Inner content ─────────────────────────────────── */}
        <div className="px-6 pb-8 pt-6 sm:pt-8">

          {/* Icon with glow */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-brand-primary/25 blur-xl scale-150 animate-pulse-glow"
              />
              <div className="relative w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center border-2 border-brand-primary/20 shadow-brand">
                <MapPin className="w-8 h-8 text-brand-primary" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h2
              id="splash-title"
              className="text-[1.35rem] font-bold text-brand-charcoal leading-snug mb-1.5"
            >
              Where should we deliver?
            </h2>
            <p className="text-sm text-brand-slate">
              Fast delivery across selected service areas
            </p>
          </div>

          {/* ── Location cards ──────────────────────────────── */}
          <div
            role="radiogroup"
            aria-label="Select a delivery area"
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {SERVICE_AREAS.map((area) => {
              const active = selectedArea === area.id;
              return (
                <button
                  key={area.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleCardSelect(area.id)}
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border-2',
                    'transition-all duration-200 cursor-pointer',
                    'hover:-translate-y-0.5',
                    active
                      ? 'border-brand-primary bg-primary-50 shadow-brand'
                      : 'border-neutral-200 bg-white hover:border-brand-primary/50 hover:shadow-card-hover',
                  )}
                >
                  {/* Selected checkmark */}
                  {active && (
                    <CheckCircle2
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-brand-primary"
                    />
                  )}
                  <span className={cn(
                    'text-sm font-semibold transition-colors leading-none',
                    active
                      ? 'text-brand-primary'
                      : 'text-brand-charcoal group-hover:text-brand-primary',
                  )}>
                    {area.name}
                  </span>
                  <span className={cn(
                    'text-xs transition-colors',
                    active ? 'text-primary-600' : 'text-brand-slate',
                  )}>
                    {area.eta}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Divider ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5" aria-hidden="true">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[0.68rem] font-bold text-brand-steel tracking-widest uppercase">
              Or enter pincode
            </span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* ── Pincode row ─────────────────────────────────── */}
          <div className="flex gap-2 mb-1.5">
            <input
              ref={pincodeRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 6-digit pincode"
              value={pincode}
              onChange={handlePincodeChange}
              onKeyDown={handlePincodeKeyDown}
              maxLength={6}
              aria-label="6-digit pincode"
              aria-describedby={pincodeStatus !== 'idle' ? 'pincode-msg' : undefined}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm placeholder:text-brand-steel',
                'bg-brand-fog border focus:outline-none focus:ring-2 focus:bg-white',
                'transition-all duration-200',
                pincodeStatus === 'valid'
                  ? 'border-brand-success focus:ring-brand-success/25 focus:border-brand-success'
                  : pincodeStatus === 'invalid'
                  ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400'
                  : 'border-neutral-200 focus:ring-brand-primary/25 focus:border-brand-primary',
              )}
            />
            <button
              onClick={handlePincodeCheck}
              disabled={pincode.length !== 6 || pincodeStatus === 'checking'}
              aria-label="Check pincode availability"
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-semibold min-w-[72px]',
                'transition-all duration-150 active:scale-[0.97]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                pincode.length === 6 && pincodeStatus !== 'checking'
                  ? 'bg-brand-primary text-white shadow-brand hover:bg-brand-dark hover:shadow-brand-lg'
                  : 'bg-neutral-100 text-brand-slate',
              )}
            >
              {pincodeStatus === 'checking'
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : 'Check'
              }
            </button>
          </div>

          {/* Pincode feedback */}
          <div className="min-h-[22px] mb-5">
            {pincodeStatus === 'valid' && pincodeArea && (
              <p
                id="pincode-msg"
                role="status"
                className="flex items-center gap-1.5 text-xs text-brand-success font-medium animate-fade-in"
              >
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                We deliver to {getAreaName(pincodeArea)} · {SERVICE_AREAS.find(a => a.id === pincodeArea)?.eta}
              </p>
            )}
            {pincodeStatus === 'invalid' && (
              <p
                id="pincode-msg"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-red-500 font-medium animate-fade-in"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                We don&apos;t deliver to this pincode yet
              </p>
            )}
          </div>

          {/* ── CTA ─────────────────────────────────────────── */}
          <button
            onClick={handleConfirm}
            disabled={!ctaReady}
            aria-label={
              ctaReady
                ? `Confirm delivery to ${getAreaName(activeSelection!)}`
                : 'Select a delivery area to continue'
            }
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'py-3.5 rounded-xl text-sm font-semibold',
              'transition-all duration-200 active:scale-[0.98]',
              ctaReady
                ? 'bg-brand-primary text-white shadow-brand hover:bg-brand-dark hover:shadow-brand-lg'
                : 'bg-neutral-100 text-brand-steel cursor-not-allowed',
            )}
          >
            {ctaReady ? (
              <>
                Deliver to {getAreaName(activeSelection!)}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            ) : (
              'Select a delivery area to continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
