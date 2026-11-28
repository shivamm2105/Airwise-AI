/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070B16',
          900: '#0B1120',
          800: '#111C33',
          700: '#1A294A',
          600: '#263B66'
        },
        teal: {
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1'
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857'
        },
        pollution: {
          good: '#10B981',
          moderate: '#F59E0B',
          unhealthySensitive: '#F97316',
          unhealthy: '#EF4444',
          veryUnhealthy: '#8B5CF6',
          hazardous: '#7F1D1D'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
