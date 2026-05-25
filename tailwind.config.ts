import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:  '#F5A623',
          dark:     '#E8760A',
          charcoal: '#1A1A1A',
          bg:       '#FAFAFA',
        },
        primary: {
          DEFAULT: '#F5A623',
          dark: '#E8760A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fade-in 0.4s ease-out',
        'slide-up':   'slide-up 0.3s ease-out',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up':   { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-glow': { '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(245, 166, 35, 0)' } },
      },
    },
  },
  plugins: [],
}
export default config
