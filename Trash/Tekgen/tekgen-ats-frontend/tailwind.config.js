module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tekgen Brand Palette
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',  // Primary brand blue
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#1e2d5c',
          900: '#0f172a',  // Deep navy (sidebar)
          950: '#080e1d',
        },
        // Sidebar specific
        sidebar: {
          bg:       '#0f172a',
          hover:    '#1e293b',
          active:   '#1e3a8a',
          border:   '#1e293b',
          text:     '#94a3b8',
          textActive:'#ffffff',
        },
        // Status colors
        status: {
          applied:   '#6366f1',
          screened:  '#8b5cf6',
          submitted: '#3b82f6',
          interview: '#f59e0b',
          offer:     '#10b981',
          hired:     '#059669',
          rejected:  '#ef4444',
          onhold:    '#94a3b8',
        },
        // JD health
        health: {
          good:    '#10b981',
          atrisk:  '#f59e0b',
          stalled: '#ef4444',
        },
        // Neutral surface
        surface: {
          DEFAULT: '#f8fafc',
          card:    '#ffffff',
          border:  '#e2e8f0',
          muted:   '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card:   '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        sidebar: '2px 0 8px 0 rgba(0,0,0,0.25)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn: { '0%': { transform: 'translateX(-8px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
};
