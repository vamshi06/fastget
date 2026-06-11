'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, name, className, ...props }, ref) => {
    return (
      <div className="relative mt-2">
        <input
          ref={ref}
          id={name}
          name={name}
          placeholder=" "
          className={cn(
            'peer w-full px-4 py-3.5 rounded-xl border border-neutral-300',
            'text-sm text-brand-charcoal bg-white',
            'focus:outline-none focus:border-brand-primary transition-colors',
            className
          )}
          {...props}
        />
        <label
          htmlFor={name}
          className={cn(
            'absolute left-3 pointer-events-none transition-all duration-200',
            // Active / filled: label sits ON the top border
            'top-0 -translate-y-1/2 text-xs text-brand-charcoal bg-white px-1',
            // Empty & unfocused: label floats inside as placeholder
            'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2',
            'peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-400',
            'peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0',
            // On focus: always bring label to border
            'peer-focus:top-0 peer-focus:-translate-y-1/2',
            'peer-focus:text-xs peer-focus:text-brand-charcoal',
            'peer-focus:bg-white peer-focus:px-1',
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

FloatingInput.displayName = 'FloatingInput';
