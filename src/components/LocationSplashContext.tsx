'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LocationSplash } from './LocationSplash';
import { isStaffRoute } from '@/lib/staff-routes';

export const SERVICE_AREAS = [
  { id: 'mumbai', name: 'Mumbai', eta: '2–4 hrs' },
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
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('selectedLocation');
    const seen = localStorage.getItem('splashSeen');
    if (saved) {
      // Migrate legacy area ids (andheri/goregaon/malad) to the current service area
      const valid = SERVICE_AREAS.some(a => a.id === saved);
      const area = valid ? saved : SERVICE_AREAS[0].id;
      setSelectedLocation(area);
      if (!valid) localStorage.setItem('selectedLocation', area);
    }
    if (!seen) setIsOpen(true);
  }, []);

  const openSplash = useCallback(() => setIsOpen(true), []);

  const handleConfirm = useCallback((area: string) => {
    setSelectedLocation(area);
    localStorage.setItem('selectedLocation', area);
    localStorage.setItem('splashSeen', '1');
  }, []);

  const handleClose = useCallback(() => {
    localStorage.setItem('splashSeen', '1');
    setIsOpen(false);
  }, []);

  // The "choose your area" splash is for shoppers - it would cover the admin
  // login / admin screens on a fresh phone browser.
  const staffRoute = isStaffRoute(pathname);

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
