'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LocationSplash } from './LocationSplash';
import { isStaffRoute } from '@/lib/staff-routes';
import { useNativeBackHandler } from '@/lib/native-bridge';

// The delivery time shown for an area is DELIVERY_ETA_MINUTES (service-area.ts).
export const SERVICE_AREAS = [
  { id: 'mumbai', name: 'Mumbai' },
] as const;

export type AreaId = typeof SERVICE_AREAS[number]['id'];

interface LocationSplashContextValue {
  selectedLocation: string | null;
  openSplash: () => void;
}

const LocationSplashContext = createContext<LocationSplashContextValue>({
  selectedLocation: null,
  openSplash: () => {},
});

export function useLocationSplash() {
  return useContext(LocationSplashContext);
}

export function LocationSplashProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  // FastGet serves one area today, so nobody has to pick it before shopping -
  // the picker only opens when the customer taps the location in the header.
  const [selectedLocation, setSelectedLocation] = useState<string | null>(SERVICE_AREAS[0].id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let saved: string | null = null;
    try { saved = localStorage.getItem('selectedLocation'); } catch {}
    if (saved) {
      // Migrate legacy area ids (andheri/goregaon/malad) to the current service area
      const valid = SERVICE_AREAS.some(a => a.id === saved);
      const area = valid ? saved : SERVICE_AREAS[0].id;
      setSelectedLocation(area);
      if (!valid) {
        try { localStorage.setItem('selectedLocation', area); } catch {}
      }
    }
  }, []);

  const openSplash = useCallback(() => setIsOpen(true), []);

  const handleConfirm = useCallback((area: string) => {
    setSelectedLocation(area);
    try { localStorage.setItem('selectedLocation', area); } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // The "choose your area" splash is for shoppers - it would cover the admin
  // login / admin screens on a fresh phone browser.
  const staffRoute = isStaffRoute(pathname);

  // App: hardware Back closes the picker instead of leaving the screen.
  useNativeBackHandler(mounted && isOpen && !staffRoute, handleClose);

  return (
    <LocationSplashContext.Provider value={{ selectedLocation, openSplash }}>
      {children}
      {mounted && isOpen && !staffRoute && (
        <LocationSplash
          initialSelected={selectedLocation}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </LocationSplashContext.Provider>
  );
}
