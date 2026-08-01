/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── "Coastal Azure" — soft ice ground, ocean blue, sand accent ──
        //
        // Light values carry the atmosphere: a soft ice page, pure-white cards
        // lifting off it, seafoam and sand used as tints. Light colours cannot
        // carry white text, so every family also has a deeper cut — DEFAULT for
        // solid fills, `-ink` for text on light grounds — and foregrounds only
        // ever use those. Each pairing was checked against all THREE grounds,
        // not just white: a value can pass on white and still fail on a tinted
        // panel, which is exactly how the previous palette shipped a failure.
        ink: '#14243D',            // deepest — headlines and hard edges
        // NOT named `base`. A colour called `base` generates a `text-base`
        // utility that collides with Tailwind's `text-base` FONT SIZE, and the
        // colour wins — so every `text-base` heading rendered in the page colour,
        // invisible on a white card. Renamed rather than worked around.
        paper: '#F4F7F6',          // page — soft ice, cool and bright
        surface: '#FFFFFF',        // cards — pure white, natural elevation, no
                                   // harsh shadow needed against the tinted page
        'surface-alt': '#E6EEF1',  // inputs / nested / hover
        line: '#D3E0E5',           // soft cool hairline — the main structural tool
        muted: '#55677D',          // secondary text — 4.93:1 on the TINTED panel,
                                   // the worst case, not white (5.80:1)
        text: '#1D2A44',           // primary text — dark slate

        // Ocean blue. `light` is the seafoam wash used for hovers, tag
        // highlights and focus rings; DEFAULT is what carries white text on a
        // solid button (5.50:1). `-ink` is a shade deeper for links and labels.
        primary: {
          DEFAULT: '#2A6F97',
          light: '#A9D6E5',
          dark: '#1F5474',
        },
        'primary-ink': '#235E80',
        accent: {
          DEFAULT: '#2A6F97',
          light: '#A9D6E5',
          dark: '#1F5474',
        },

        // Warm sand for attention — "approximate", "awaiting", "check this".
        // Sea and sand: warm against the blue, so it can never be mistaken for
        // an action. Too light for white text — a solid chip takes `text-ink`.
        highlight: {
          DEFAULT: '#D9A441',
          light: '#EFCB87',
        },
        'highlight-ink': '#8A6410',

        royal: {
          DEFAULT: '#35597A',
          light: '#5E82A5',
          dark: '#22405C',
        },

        // Semantic colours stay clearly separate from the blue, so "confirmed"
        // and "interactive" can never be confused. Both carry white text.
        success: '#0A8046',
        'success-ink': '#0A7040',
        danger: '#C7303F',
        'danger-ink': '#A81F2C',
        info: '#2A6F97',
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
      // Every step lifted roughly one notch. The interface was built on
      // text-sm (408 uses) for body and text-xs (337) for labels — 14px and
      // 12px, which is fine on a desktop mock and genuinely small on a phone.
      //
      // Overriding the scale moves all ~990 usages at once; editing the class
      // names individually would have meant touching hundreds of files and
      // would drift the first time someone added a new one. Line heights are
      // raised with the sizes, otherwise larger text just gets more cramped.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],   // 13px  (was 12)
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],   // 15px  (was 14)
        base: ['1.0625rem', { lineHeight: '1.625rem' }], // 17px  (was 16)
        lg: ['1.1875rem', { lineHeight: '1.75rem' }],    // 19px  (was 18)
        xl: ['1.375rem', { lineHeight: '1.875rem' }],    // 22px  (was 20)
        '2xl': ['1.625rem', { lineHeight: '2.125rem' }], // 26px  (was 24)
        '3xl': ['2rem', { lineHeight: '2.375rem' }],     // 32px  (was 30)
        '4xl': ['2.5rem', { lineHeight: '2.75rem' }],    // 40px  (was 36)
        '5xl': ['3.125rem', { lineHeight: '1.05' }],     // 50px  (was 48)
        '6xl': ['3.875rem', { lineHeight: '1.03' }],     // 62px  (was 60)
        '7xl': ['4.75rem', { lineHeight: '1' }],         // 76px  (was 72)
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
        // Tinted blue rather than neutral grey, so shadows sit in the same
        // light as the page instead of greying it down.
        glow: '0 20px 48px -22px rgba(42,111,151,0.30)',
        'glow-sm': '0 10px 28px -16px rgba(42,111,151,0.26)',
        'glow-ochre': '0 20px 48px -22px rgba(217,164,65,0.30)',
        card: '0 1px 2px rgba(20,36,61,0.05)',
        'card-lg': '0 16px 40px -24px rgba(20,36,61,0.20)',
        lift: '0 24px 56px -28px rgba(20,36,61,0.24)',
      },
      backgroundImage: {
        // Every stop is dark enough to carry white text — these are used as
        // button and panel fills, so a light stop would strand the label.
        'brand-gradient': 'linear-gradient(135deg, #2A6F97 0%, #1F5474 100%)',
        'brand-sheen': 'linear-gradient(120deg, #3583AF 0%, #2A6F97 58%, #1F5474 100%)',
        'warm-deep': 'linear-gradient(140deg, #163B52 0%, #1F5474 45%, #2A6F97 100%)',
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
