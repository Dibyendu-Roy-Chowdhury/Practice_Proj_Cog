/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // Prevent Tailwind's base reset from conflicting with Ant Design's own reset
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────
        navy: {
          DEFAULT: '#000048',
          light:   '#0a0a6e',
          muted:   '#1a1a8c',
          surface: 'rgba(0,0,72,0.05)',
        },
        cyan: {
          DEFAULT: '#00B5E2',
          light:   '#33c4e8',
          muted:   '#0099c2',
        },
        // ── Neutrals ────────────────────────────────────────
        surface: {
          DEFAULT: '#FFFFFF',
          raised:  '#F2F4F7',
          sunken:  '#E8EBF0',
        },
        border: {
          DEFAULT: '#E4E7EC',
          strong:  '#C5CAD4',
        },
        // ── Ink / Text ───────────────────────────────────────
        ink: {
          primary:   '#101828',
          secondary: '#475467',
          tertiary:  '#98A2B3',
          inverse:   '#FFFFFF',
          disabled:  '#D0D5DD',
        },
        // ── Semantic ────────────────────────────────────────
        status: {
          success:        '#12B76A',
          'success-bg':   '#ECFDF3',
          'success-border':'#A9EFC5',
          warning:        '#F79009',
          'warning-bg':   '#FFFAEB',
          'warning-border':'#FEC84B',
          error:          '#F04438',
          'error-bg':     '#FEF3F2',
          'error-border': '#FECDCA',
          info:           '#0BA5EC',
          'info-bg':      '#F0F9FF',
          'info-border':  '#B9E6FE',
        },
      },

      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },

      // Strict 7-step typographic scale — do not add intermediate sizes
      fontSize: {
        'xs':   ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        'sm':   ['12px', { lineHeight: '18px' }],
        'base': ['13px', { lineHeight: '20px' }],
        'md':   ['14px', { lineHeight: '22px' }],
        'lg':   ['16px', { lineHeight: '24px' }],
        'xl':   ['20px', { lineHeight: '28px' }],
        '2xl':  ['24px', { lineHeight: '32px' }],
        '3xl':  ['30px', { lineHeight: '38px' }],
        '4xl':  ['36px', { lineHeight: '44px' }],
      },

      borderRadius: {
        'none': '0',
        'sm':   '2px',
        DEFAULT: '4px',
        'md':   '6px',
        'lg':   '8px',     // max — only for modals/drawers
        'full': '9999px',  // pills and badge dots only
      },

      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'raised': '0 4px 8px rgba(0,0,0,0.08)',
        'none':   'none',
      },

      spacing: {
        'sidebar': '240px',
        'topbar':  '56px',
      },
    },
  },
  plugins: [],
};
