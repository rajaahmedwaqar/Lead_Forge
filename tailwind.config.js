/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
      colors: {
        paper: v('paper'),
        surface: v('surface'),
        ink: v('ink'),
        line: v('line'),
        moss: { DEFAULT: v('brand'), dark: v('brand-dark'), light: v('brand-soft'), fg: v('brand-fg') },
        accent: v('accent'),
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
        warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 4px 16px rgb(var(--shadow) / 0.05)',
        pop: '0 12px 40px rgb(var(--shadow) / 0.22)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
      },
      animation: {
        'fade-up': 'fade-up .25s ease-out both',
        'slide-in': 'slide-in .22s ease-out both',
      },
    },
  },
  plugins: [],
};
