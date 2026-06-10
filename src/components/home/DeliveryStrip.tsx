'use client';

import { Zap, ChevronRight, MapPin } from 'lucide-react';
import { useLocationSplash, SERVICE_AREAS } from '@/components/LocationSplashContext';

export function DeliveryStrip() {
  const { selectedLocation, openSplash } = useLocationSplash();

  const area = selectedLocation
    ? SERVICE_AREAS.find(a => a.id === selectedLocation)
    : null;

  return (
    <button
      onClick={openSplash}
      className="w-full bg-green-50 border-b border-green-100 px-4 py-2 flex items-center justify-center gap-2
                 hover:bg-green-100 active:bg-green-200 transition-colors duration-150 group"
    >
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
      <Zap className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
      <span className="text-sm font-semibold text-green-700">
        {area
          ? `Delivering to ${area.name} in ${area.eta}`
          : 'Delivering to Mumbai in 30–60 mins'
        }
      </span>
      <span className="text-xs text-green-500 font-medium hidden sm:inline">
        · Tap to change
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-green-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-150" />
    </button>
  );
}
