'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Live preview for the product "Image URL" field, so admins can see the
 * picture (or that the link is broken) before saving.
 */
export function ImageUrlPreview({ url }: { url: string }) {
  const trimmed = url.trim();
  const [status, setStatus] = useState<'loading' | 'ok' | 'broken'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [trimmed]);

  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return <p className="text-xs text-red-600 mt-1">The link must start with http:// or https://</p>;
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="w-20 h-20 rounded-xl border border-neutral-200 bg-brand-fog overflow-hidden flex items-center justify-center flex-shrink-0">
        {status === 'broken' ? (
          <ImageOff className="w-6 h-6 text-red-400" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL, preview only
          <img
            key={trimmed}
            src={trimmed}
            alt="Product image preview"
            className="w-full h-full object-contain"
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('broken')}
          />
        )}
      </div>
      <p className={`text-xs ${status === 'broken' ? 'text-red-600' : 'text-brand-steel'}`}>
        {status === 'broken'
          ? 'This image could not be loaded. Check the link - customers would see a broken image.'
          : status === 'ok'
            ? 'Preview - this is how the image will load for customers.'
            : 'Loading preview…'}
      </p>
    </div>
  );
}
