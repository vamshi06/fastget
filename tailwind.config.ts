import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import twColors from 'tailwindcss/colors'

/* ── Dark mode palette ───────────────────────────────────────────────────
   Pages are written with light-theme classes (bg-white, text-brand-charcoal,
   border-neutral-200, bg-green-50 text-green-700 ...). Rather than adding
   dark: variants to every file, the palette colours themselves are CSS
   variables that html.dark swaps (see darkModeVars plugin below).

   Text-ish utilities ("ink": text, border, ring, divide, placeholder...) and
   background utilities ("paint": bg, gradient stops) are mapped separately:
   - ink flips fully: text-green-700 -> light green, text-brand-charcoal -> near-white.
   - paint only darkens the light tints (50-300, white, fog); 400+ stay as-is
     so solid buttons like bg-red-600 hover:bg-red-700 keep white text readable.
   Print always uses the light values (dark vars are screen-only). */

type RGB = [number, number, number]
const toRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (c: number[]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
/** `color` laid over `base` at `amount` opacity, as an opaque hex. */
const tint = (color: string, base: string, amount: number) => {
  const a = toRgb(color), b = toRgb(base)
  return toHex(a.map((v, i) => Math.round(b[i] + (v - b[i]) * amount)))
}

const DARK_PAGE    = '#0F0F11'
const DARK_BG      = '#131316'
const DARK_SURFACE = '#1B1B1F'

const lightVars: Record<string, string> = {}
const darkVars: Record<string, string> = {}
/** A colour that is `light` normally and `dark` under html.dark. */
const themed = (name: string, light: string, dark: string) => {
  lightVars[`--c-${name}`] = toRgb(light).join(' ')
  darkVars[`--c-${name}`] = toRgb(dark).join(' ')
  return `rgb(var(--c-${name}) / <alpha-value>)`
}

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
type Shade = (typeof SHADES)[number]
type Scale = Record<Shade, string>

const GREYS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const
const ACCENTS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const

// Greys all share one dark ramp - the app mixes neutral/gray freely.
const GREY_INK_DARK: Scale = {
  50: '#232327', 100: '#2C2C31', 200: '#3A3A40', 300: '#4A4A51', 400: '#7A7A82',
  500: '#9A9AA1', 600: '#B4B4BA', 700: '#CFCFD4', 800: '#E2E2E6', 900: '#F0F0F2', 950: '#FAFAFA',
}
const GREY_PAINT_DARK: Partial<Scale> = {
  50: '#222226', 100: '#29292E', 200: '#323238', 300: '#3E3E45', 400: '#56565E',
}

const inkScale = (name: string, light: Scale, dark: Partial<Scale>) =>
  Object.fromEntries(SHADES.map((s) => [s, dark[s] ? themed(`ink-${name}-${s}`, light[s], dark[s]!) : light[s]]))
const paintScale = (name: string, light: Scale, dark: Partial<Scale>) =>
  Object.fromEntries(SHADES.map((s) => [s, dark[s] ? themed(`paint-${name}-${s}`, light[s], dark[s]!) : light[s]]))

/** Light tints become translucent-looking washes; dark text shades become light. */
const accentInkDark = (c: Scale): Partial<Scale> => ({
  50: tint(c[500], DARK_SURFACE, 0.14), 100: tint(c[500], DARK_SURFACE, 0.22),
  200: tint(c[500], DARK_SURFACE, 0.35), 300: tint(c[500], DARK_SURFACE, 0.5),
  600: c[400], 700: c[300], 800: c[200], 900: c[100], 950: c[50],
})
const accentPaintDark = (c: Scale): Partial<Scale> => ({
  50: tint(c[500], DARK_SURFACE, 0.12), 100: tint(c[500], DARK_SURFACE, 0.18),
  200: tint(c[500], DARK_SURFACE, 0.28), 300: tint(c[500], DARK_SURFACE, 0.4),
})

const PRIMARY: Scale = {
  50: '#FFF8EC', 100: '#FEEFD3', 200: '#FDDBA6', 300: '#FCC070', 400: '#FAA037',
  500: '#F5A623', 600: '#DC8A0E', 700: '#B8690A', 800: '#9A5208', 900: '#7A3E07', 950: '#5A2D05',
}
const BRAND_LIGHT = '#FEF3DC'

type Palette = { [key: string]: string | Palette }

const ink: Palette = {
  white: '#FFFFFF',
  brand: {
    primary:  '#F5A623',
    dark:     '#DC8A0E',
    deeper:   '#B8690A',
    light:    themed('ink-brand-light', BRAND_LIGHT, tint('#F5A623', DARK_SURFACE, 0.22)),
    charcoal: themed('ink-brand-charcoal', '#1C1C1E', '#F2F2F3'),
    graphite: themed('ink-brand-graphite', '#3A3A3C', '#D4D4D8'),
    slate:    themed('ink-brand-slate', '#6B6B6E', '#A6A6AC'),
    fog:      themed('ink-brand-fog', '#F5F5F5', '#2C2C31'),
    surface:  themed('ink-brand-surface', '#FFFFFF', DARK_SURFACE),
    steel:    themed('ink-brand-steel', '#9A9A9A', '#808087'),
    success:  '#16A34A',
    bg:       themed('ink-brand-bg', '#FAFAFA', DARK_BG),
  },
  primary: {
    ...inkScale('primary', PRIMARY, {
      ...accentInkDark(PRIMARY),
      600: undefined, // brand orange stays brand orange
    }),
    DEFAULT: '#F5A623',
    dark:    '#DC8A0E',
  },
}
const paint: Palette = {
  white: themed('paint-white', '#FFFFFF', DARK_SURFACE),
  brand: {
    ...(ink.brand as Palette),
    // Dark sections (footer, back-office sidebar) stay dark.
    charcoal: '#1C1C1E',
    graphite: '#3A3A3C',
    slate:    '#6B6B6E',
    steel:    '#9A9A9A',
    light:    themed('paint-brand-light', BRAND_LIGHT, tint('#F5A623', DARK_SURFACE, 0.16)),
    fog:      themed('paint-brand-fog', '#F5F5F5', DARK_PAGE),
  },
  primary: {
    ...paintScale('primary', PRIMARY, accentPaintDark(PRIMARY)),
    DEFAULT: '#F5A623',
    dark:    '#DC8A0E',
  },
}
for (const g of GREYS) {
  ink[g] = inkScale(g, twColors[g] as Scale, GREY_INK_DARK)
  paint[g] = paintScale(g, twColors[g] as Scale, GREY_PAINT_DARK)
}
for (const a of ACCENTS) {
  const c = twColors[a] as Scale
  ink[a] = inkScale(a, c, accentInkDark(c))
  paint[a] = paintScale(a, c, accentPaintDark(c))
}

const darkModeVars = plugin(({ addBase }) => {
  addBase({
    ':root': { ...lightVars, colorScheme: 'light' },
    '@media screen': { 'html.dark': { ...darkVars, colorScheme: 'dark' } },
  })
})

const config: Config = {
  // html.dark is set before first paint by THEME_SCRIPT (src/lib/theme.ts).
  darkMode: 'class',
  // hover: styles only on devices that can actually hover, so a tap on a
  // phone doesn't leave a button stuck in its hover colour.
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Light values are unchanged from before; see the palette notes at the top.
      colors: ink,
      backgroundColor: paint,
      gradientColorStops: paint,
      ringOffsetColor: { white: paint.white as string },
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
        'screen-in':  'fade-in 0.18s ease-out',
        'sheet-up':   'sheet-up 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-up':   'slide-up 0.3s ease-out',
        'slide-right':'slide-right 0.4s ease-out',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'ticker':     'ticker 0.45s ease-out',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' },                                               '100%': { opacity: '1' } },
        'slide-up':   { '0%': { transform: 'translateY(20px)', opacity: '0' },                '100%': { transform: 'translateY(0)', opacity: '1' } },
        'sheet-up':   { '0%': { transform: 'translateY(100%)' },                              '100%': { transform: 'translateY(0)' } },
        'slide-right':{ '0%': { transform: 'translateX(-12px)', opacity: '0' },               '100%': { transform: 'translateX(0)', opacity: '1' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' },                              '100%': { backgroundPosition: '200% 0' } },
        'pulse-glow': { '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' },        '50%': { boxShadow: '0 0 0 8px rgba(245, 166, 35, 0)' } },
        'ticker':     { '0%': { opacity: '0', transform: 'translateY(6px)' },                 '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [darkModeVars],
}
export default config
