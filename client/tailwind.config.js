/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── "Survey" — quiet, warm, premium ──
        // A near-white paper ground (warm, but nowhere near cream — cream is
        // the giveaway of generic warmth) with a deep ink-navy accent that is
        // desaturated almost to black, so it reads as considered rather than
        // technological. Smoothness comes from soft rules and gentle shadow,
        // not from rounding the corners.
        ink: '#10131A',            // deepest — headlines and hard edges
        base: '#FAF9F7',           // page — warm paper, a half-step off white
        surface: '#FFFFFF',        // cards — true white, lifted by warmth beneath
        'surface-alt': '#F4F2EF',  // inputs / nested / hover
        line: '#E7E3DE',           // soft warm hairline — the main structural tool
        muted: '#5E636C',          // secondary text — dark enough to clear AA on the
                                   // TINTED panels too, not just on white. The
                                   // lighter value passed at 5.6:1 on white and
                                   // then failed at 4.38:1 on a tinted banner.
        text: '#1A1D24',           // primary text

        // Deep ink navy. Almost black, quietly blue — the colour of good
        // stationery rather than of software.
        primary: {
          DEFAULT: '#1B2A41',
          light: '#2F4568',
          dark: '#121C2C',
        },
        'primary-ink': '#1B2A41',
        accent: {
          DEFAULT: '#1B2A41',
          light: '#2F4568',
          dark: '#121C2C',
        },

        // Warm bronze for attention — "approximate", "awaiting", "check this".
        // Distinct from the navy so it never reads as an action.
        highlight: {
          DEFAULT: '#A87C3E',
          light: '#D0A96A',
        },
        'highlight-ink': '#7A5522',

        royal: {
          DEFAULT: '#3A4560',
          light: '#5A688A',
          dark: '#232C42',
        },

        // Semantic colours stay clearly separate from the navy, so "confirmed"
        // and "interactive" can never be confused.
        success: '#2F7A5A',
        'success-ink': '#1F5C42',
        danger: '#B23B2E',
        'danger-ink': '#8E2C21',
        info: '#3A4560',
      },
      fontFamily: {
        // Archivo carries the interface — a grotesque with more character than
        // the usual default, and it holds up at 11px.
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        // `serif` is what every existing heading already uses, so pointing it
        // at the expanded cut re-skins all of them at once. Wide, architectural.
        serif: ['Archivo Expanded', 'Archivo', 'system-ui', 'sans-serif'],
        display: ['Archivo Expanded', 'Archivo', 'system-ui', 'sans-serif'],
        // Every figure, reference and coordinate.
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        // Square by default — this is the requested shape language and it suits
        // a measured interface. `full` is deliberately left alone so avatars,
        // badges and the navigation pill stay circular; that contrast is what
        // makes the pill read as intentional rather than inconsistent.
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      boxShadow: {
        // Tight and low-contrast: a drawing sits ON the sheet rather than
        // hovering above it. Depth comes from the hairline, not the blur.
        glow: '0 20px 48px -22px rgba(27,42,65,0.30)',
        'glow-sm': '0 10px 28px -16px rgba(27,42,65,0.26)',
        'glow-ochre': '0 20px 48px -22px rgba(168,124,62,0.26)',
        card: '0 1px 2px rgba(16,19,26,0.04)',
        'card-lg': '0 16px 40px -24px rgba(16,19,26,0.22)',
        lift: '0 24px 56px -28px rgba(16,19,26,0.26)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1B2A41 0%, #3A4560 100%)',
        'brand-sheen': 'linear-gradient(120deg, #2F4568 0%, #1B2A41 58%, #121C2C 100%)',
        'warm-deep': 'linear-gradient(140deg, #121C2C 0%, #1B2A41 45%, #3A4560 100%)',
      },
      letterSpacing: {
        meta: '0.14em',
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
        // Content arrives from just below, quickly, on a decelerating curve —
        // it should feel like the page settling, not like a slideshow.
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // A rule striking itself across the sheet.
        drawIn: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'floatSlow 11s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        aurora: 'auroraShift 18s ease-in-out infinite',
        rise: 'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'draw-in': 'drawIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        sheen: 'sheen 1.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
