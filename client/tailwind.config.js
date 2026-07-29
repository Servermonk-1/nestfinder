/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── "Survey" — graphite, paper and one ultramarine signal ──
        // Cool and measured. The previous palette was warm cream + terracotta,
        // which reads as hospitality; this is a platform where students commit
        // real money to a place they haven't seen, so it borrows its manners
        // from drafting and finance instead.
        ink: '#0B0E13',            // deepest graphite — headlines, hard edges
        base: '#EEF0F3',           // page — cool paper
        surface: '#FFFFFF',        // cards — true white so the grid reads crisp
        'surface-alt': '#F4F6F8',  // inputs / nested / hover
        line: '#DBE0E6',           // hairline rules and borders
        muted: '#5A6472',          // secondary text (7.0:1 on white)
        text: '#14181F',           // primary text

        // Ultramarine: the single interactive colour. Precision, not play.
        primary: {
          DEFAULT: '#1D3FD1',
          light: '#4B7BFF',
          dark: '#152FA0',
        },
        // Text-safe twin, for small labels and links on light surfaces.
        'primary-ink': '#1A38B8',
        accent: {
          DEFAULT: '#1D3FD1',
          light: '#4B7BFF',
          dark: '#152FA0',
        },

        // Attention — surveyor's amber. "Approximate", "awaiting", "check this".
        // Never success, never danger.
        highlight: {
          DEFAULT: '#C77A0E',
          light: '#E8A93C',
        },
        'highlight-ink': '#8A5406',

        royal: {
          DEFAULT: '#3B4A63',
          light: '#5C6E8C',
          dark: '#25314A',
        },

        success: '#0E8A5F',
        'success-ink': '#076646',
        danger: '#C0392B',
        'danger-ink': '#96271C',
        info: '#1D3FD1',
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
        glow: '0 10px 30px -12px rgba(29, 63, 209, 0.42)',
        'glow-sm': '0 6px 18px -10px rgba(29, 63, 209, 0.38)',
        'glow-ochre': '0 10px 30px -12px rgba(199, 122, 14, 0.35)',
        card: '0 1px 2px rgba(11, 14, 19, 0.04)',
        'card-lg': '0 12px 34px -18px rgba(11, 14, 19, 0.28)',
        lift: '0 18px 44px -22px rgba(11, 14, 19, 0.34)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #1D3FD1 0%, #4B7BFF 100%)',
        'brand-sheen': 'linear-gradient(120deg, #4B7BFF 0%, #1D3FD1 55%, #152FA0 100%)',
        'warm-deep': 'linear-gradient(140deg, #152FA0 0%, #1D3FD1 45%, #3B4A63 100%)',
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
