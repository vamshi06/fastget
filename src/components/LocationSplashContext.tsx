'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LocationSplash } from './LocationSplash';

export const SERVICE_AREAS = [
  { id: 'andheri',  name: 'Andheri',  eta: '2–3 hrs' },
  { id: 'goregaon', name: 'Goregaon', eta: '2–3 hrs' },
  { id: 'malad',    name: 'Malad',    eta: '3–4 hrs' },
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('selectedLocation');
    const seen = localStorage.getItem('splashSeen');
    if (saved) setSelectedLocation(saved);
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

  return (
    <LocationSplashContext.Provider value={{ selectedLocation, openSplash }}>
      {children}
      {mounted && isOpen && (
        <LocationSplash
          initialSelected={selectedLocation}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </LocationSplashContext.Provider>
  );
}
