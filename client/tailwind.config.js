/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Warm Stone — a calm, mid-tone, editorial palette ──
        ink: '#1D1712',            // deepest espresso
        base: '#DAD4C9',           // page — warm greige (mid, not bright, not dark)
        surface: '#F5F1EA',        // cards — soft cream that lifts off the page
        'surface-alt': '#EAE3D6',  // inputs / hover / nested
        line: '#C9C0B0',           // warm hairline borders
        muted: '#5E5649',          // secondary text — warm taupe (darkened to clear WCAG AA 4.5:1 on every surface)
        text: '#2B2620',           // primary text — espresso

        // Terracotta hero + warm ochre — earthy, refined, not loud
        primary: {
          // Darkened 5% from #C2603F so WHITE button text clears WCAG AA (4.5:1).
          // At the old value it was 4.17:1 — and white is already the lightest
          // possible text, so the background was the only thing left to change.
          DEFAULT: '#B85B3C',
          light: '#DB8B6A',
          dark: '#9C4A2E',
        },
        // Text-only terracotta. Same family as `primary`, darkened so small
        // labels/links clear WCAG AA (4.5:1) on every surface. Backgrounds,
        // gradients and borders keep the brighter `primary`.
        'primary-ink': '#8A4028',
        accent: {
          DEFAULT: '#C2603F',
          light: '#DB8B6A',
          dark: '#9C4A2E',
        },
        highlight: {
          DEFAULT: '#C79A3E',
          light: '#E4C079',
        },
        // Text-only ochre. `highlight` is a fine BACKGROUND but only reaches
        // ~2.4:1 as small text on cream, which axe flags as a serious failure.
        // Same trick as `primary-ink`: darken for text, leave fills alone.
        'highlight-ink': '#7A5B15',
        royal: {
          DEFAULT: '#8A5A44',
          light: '#B08469',
          dark: '#67402F',
        },

        success: '#6E8B5E',
        // Text-only green.  is fine as a FILL but only ~3.3:1 as small
        // text on a tinted surface. Completes the ink set: primary/danger/
        // highlight/success all have a darkened text-safe twin.
        'success-ink': '#47603A',
        danger: '#B4432E',
        // Text-only danger red — darkened to clear WCAG AA on tinted surfaces.
        'danger-ink': '#8F3423',
        info: '#5B7A99',
      },
      fontFamily: {
        // Body — Inter (clean, neutral)
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Headlines — Spectral (elegant editorial serif); kept under `serif`
        // so every existing `font-serif` heading adopts it.
        serif: ['Spectral', 'ui-serif', 'Georgia', 'serif'],
        display: ['Spectral', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 24px 58px -18px rgba(194,96,63,0.42)',
        'glow-sm': '0 14px 32px -14px rgba(194,96,63,0.36)',
        'glow-ochre': '0 24px 58px -18px rgba(199,154,62,0.4)',
        card: '0 22px 48px -24px rgba(43,38,32,0.24)',
        'card-lg': '0 46px 100px -34px rgba(43,38,32,0.3)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #C2603F 0%, #C79A3E 100%)',
        'brand-sheen': 'linear-gradient(120deg, #DB8B6A 0%, #C2603F 58%, #9C4A2E 100%)',
        'warm-deep': 'linear-gradient(140deg, #9C4A2E 0%, #C2603F 45%, #B0803A 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-24px) translateX(10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        auroraShift: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(4%, -6%) scale(1.08)' },
          '66%': { transform: 'translate(-4%, 4%) scale(0.96)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'floatSlow 11s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        aurora: 'auroraShift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
