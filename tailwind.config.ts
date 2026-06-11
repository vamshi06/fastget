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
          dark:     '#DC8A0E',
          deeper:   '#B8690A',
          light:    '#FEF3DC',
          charcoal: '#1C1C1E',
          graphite: '#3A3A3C',
          slate:    '#6B6B6E',
          fog:      '#F5F5F5',
          surface:  '#FFFFFF',
          steel:    '#9A9A9A',
          success:  '#16A34A',  
          bg:       '#FAFAFA',
        },
        primary: {
          50:      '#FFF8EC',
          100:     '#FEEFD3',
          200:     '#FDDBA6',
          300:     '#FCC070',
          400:     '#FAA037',
          500:     '#F5A623',
          600:     '#DC8A0E',
          700:     '#B8690A',
          800:     '#9A5208',
          900:     '#7A3E07',
          DEFAULT: '#F5A623',
          dark:    '#DC8A0E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand':    '0 4px 14px 0 rgba(245, 166, 35, 0.28)',
        'brand-lg': '0 8px 24px 0 rgba(245, 166, 35, 0.35)',
        'card':     '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
        'nav':      '0 1px 0 rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'hero-lines': `repeating-linear-gradient(
          -55deg,
          transparent,
          transparent 40px,
          rgba(255,255,255,0.018) 40px,
          rgba(255,255,255,0.018) 42px
        )`,
        'hero-dots': `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        'orange-shine': 'linear-gradient(135deg, #F5A623 0%, #DC8A0E 100%)',
      },
      animation: {
        'fade-in':    'fade-in 0.4s ease-out',
        'slide-up':   'slide-up 0.3s ease-out',
        'slide-right':'slide-right 0.4s ease-out',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'ticker':     'ticker 0.45s ease-out',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' },                                               '100%': { opacity: '1' } },
        'slide-up':   { '0%': { transform: 'translateY(20px)', opacity: '0' },                '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-right':{ '0%': { transform: 'translateX(-12px)', opacity: '0' },               '100%': { transform: 'translateX(0)', opacity: '1' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' },                              '100%': { backgroundPosition: '200% 0' } },
        'pulse-glow': { '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' },        '50%': { boxShadow: '0 0 0 8px rgba(245, 166, 35, 0)' } },
        'ticker':     { '0%': { opacity: '0', transform: 'translateY(6px)' },                 '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
export default config
