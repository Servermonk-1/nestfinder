/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── "Survey" — monochrome ──
        // Black on white, the way a technical drawing actually is. The listing
        // photographs become the only colour on the page, which is correct:
        // the rooms are the product, the interface is the annotation.
        //
        // ONE hue survives — red, for destructive actions only. Everything else
        // (confirmed, pending, verified, approximate) is carried by FILL WEIGHT:
        // solid black reads as settled, an outline as pending, grey as closed.
        // That is how drawings have always encoded state, and it means the
        // system never depends on a reader distinguishing two hues.
        ink: '#000000',            // true black — headlines, fills, hard edges
        base: '#F1F1F1',           // page — a desk
        surface: '#FFFFFF',        // cards — sheets laid on it
        'surface-alt': '#F6F6F6',  // inputs / nested / hover
        line: '#E2E2E2',           // hairline rules and borders
        muted: '#6B6B6B',          // secondary text (5.3:1 on white)
        text: '#0A0A0A',           // primary text

        // Interactive is simply black. Maximum contrast, no decoration.
        primary: {
          DEFAULT: '#000000',
          light: '#3D3D3D',
          dark: '#262626',
        },
        'primary-ink': '#000000',
        accent: {
          DEFAULT: '#000000',
          light: '#3D3D3D',
          dark: '#262626',
        },

        // "Approximate", "awaiting", "check this" — lower emphasis by design,
        // so it sits at mid-grey rather than shouting in amber.
        highlight: {
          DEFAULT: '#8A8A8A',
          light: '#BDBDBD',
        },
        'highlight-ink': '#4A4A4A',

        royal: {
          DEFAULT: '#3D3D3D',
          light: '#6B6B6B',
          dark: '#1A1A1A',
        },

        // Confirmed / verified / released: solid black plus a check mark. The
        // meaning comes from the tick and the label, not from green.
        success: '#000000',
        'success-ink': '#0A0A0A',

        // The one retained hue. Deleting a listing, refunding a student,
        // suspending an account — the places where a mis-click costs something.
        danger: '#B3261E',
        'danger-ink': '#8C1D18',

        info: '#000000',
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
        glow: '0 10px 30px -12px rgba(0, 0, 0, 0.30)',
        'glow-sm': '0 6px 18px -10px rgba(0, 0, 0, 0.26)',
        'glow-ochre': '0 10px 30px -12px rgba(0, 0, 0, 0.22)',
        card: '0 1px 2px rgba(11, 14, 19, 0.04)',
        'card-lg': '0 12px 34px -18px rgba(11, 14, 19, 0.28)',
        lift: '0 18px 44px -22px rgba(11, 14, 19, 0.34)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #000000 0%, #333333 100%)',
        'brand-sheen': 'linear-gradient(120deg, #3D3D3D 0%, #000000 55%, #1A1A1A 100%)',
        'warm-deep': 'linear-gradient(140deg, #000000 0%, #1F1F1F 45%, #3D3D3D 100%)',
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
