'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

/**
 * One labelled input for the auth screens (login, signup, ...), so every
 * form shares the same height, spacing and focus treatment. A password field
 * gets its own show/hide toggle.
 */
export function AuthField({
  id,
  label,
  icon: Icon,
  type = 'text',
  ...inputProps
}: { id: string; label: string; icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-brand-graphite mb-1.5">
        {label}
      </label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-steel transition-colors group-focus-within:text-brand-primary" />
        <input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          {...inputProps}
          className={`w-full h-12 pl-11 ${isPassword ? 'pr-12' : 'pr-4'} rounded-2xl border border-neutral-200 bg-white text-sm text-brand-charcoal placeholder:text-brand-slate focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-brand-steel hover:text-brand-charcoal transition-colors"
          >
            {reveal ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Primary submit button shared by the auth forms. */
export const authSubmitClass =
  'w-full h-12 mt-2 bg-brand-primary hover:bg-brand-dark active:scale-[0.98] text-white font-bold rounded-full text-[15px] shadow-brand disabled:opacity-50 disabled:shadow-none transition-all';
