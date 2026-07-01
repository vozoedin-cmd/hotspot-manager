/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        darkbg: '#0B0F19',
        glass: 'rgba(26, 35, 58, 0.65)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        primary: {
          50: '#e0fcff',
          100: '#b3f7ff',
          200: '#80f1ff',
          300: '#4deaff',
          400: '#26e6ff',
          500: '#00F0FF', /* Cyan Neon */
          600: '#00d6e6',
          700: '#00bccc',
          800: '#00a1b3',
          900: '#008599',
        },
        secondary: {
          500: '#3B82F6', /* Blue Neon */
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.4)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
};
