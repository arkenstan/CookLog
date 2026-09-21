/**
 * CookLog Tailwind preset. Colors resolve to CSS variables defined in theme.css so
 * dark/light swap without rebuilding utilities.
 * Consumed from an app stylesheet with: @config "<path>/tailwind.config.js";
 */
const v = (name) => `var(--${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      kds: '1920px', // wall-mounted / large kitchen display
    },
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        background: v('background'),
        foreground: v('foreground'),
        card: { DEFAULT: v('card'), foreground: v('card-foreground') },
        popover: { DEFAULT: v('popover'), foreground: v('popover-foreground') },
        primary: { DEFAULT: v('primary'), foreground: v('primary-foreground') },
        secondary: { DEFAULT: v('secondary'), foreground: v('secondary-foreground') },
        muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
        accent: { DEFAULT: v('accent'), foreground: v('accent-foreground') },
        destructive: { DEFAULT: v('destructive'), foreground: v('destructive-foreground') },
        success: v('success'),
        warning: v('warning'),
        border: v('border'),
        input: v('input'),
        ring: v('ring'),
        glow: v('glow'),
      },
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // KDS-scale type for the cook's docket
        'kds-md': ['2rem', { lineHeight: '1.15', fontWeight: '600' }],
        'kds-lg': ['3rem', { lineHeight: '1.05', fontWeight: '700' }],
        'kds-xl': ['4.5rem', { lineHeight: '1', fontWeight: '700' }],
      },
      boxShadow: {
        glow: '0 0 0 1px var(--glow), 0 0 24px -4px var(--glow)',
        'glow-sm': '0 0 12px -2px var(--glow)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: { fast: '120ms', base: '200ms', slow: '320ms' },
      gridTemplateColumns: {
        bento: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 8px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
      },
      animation: { 'fade-up': 'fade-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both' },
    },
  },
};
