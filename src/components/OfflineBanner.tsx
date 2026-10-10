'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';

/**
 * Thin bar at the top while the phone has no connection (common on building
 * sites). Without it, product rows just failed to load with no explanation.
 */
export function OfflineBanner() {
  const t = useTranslations('common');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    // Fixed colours (not theme tokens) so it reads the same in light and dark mode.
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-center"
      style={{ background: '#1C1C1E', color: '#FFFFFF' }}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      {t('offline')}
    </div>
  );
}
