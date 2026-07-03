/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        darkbg: '#0B1220',
        darkpanel: '#111827',
        darkborder: '#1F2937',
        neumorphic: {
          bg: '#e6eef5',
          shadowLight: '#ffffff',
          shadowDark: '#c8d0d8',
          bgDark: '#0f172a', /* slate-900 */
          shadowLightDark: '#1e293b', /* slate-800 */
          shadowDarkDark: '#020617', /* slate-950 */
        },
        primary: {
          50: '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#8b5cf6', // Violet/Purple accent
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        secondary: {
          500: '#3b82f6', // Blue accent
        },
        cuzo: {
          text: '#1e293b',
          textMuted: '#64748b',
          sidebar: '#e6eef5',
        }
      }
    },
  },
  plugins: [],
};
