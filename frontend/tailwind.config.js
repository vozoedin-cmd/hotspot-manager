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
        darkbg: '#000000',
        darkpanel: '#111111',
        darkborder: '#333333',
        primary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#ffffff', /* Primary is stark white */
          600: '#e5e5e5',
          700: '#cccccc',
          800: '#999999',
          900: '#666666',
        },
        secondary: {
          500: '#A3A3A3',
        }
      },
      boxShadow: {
        'glow-cyan': 'none',
        'glow-blue': 'none',
        'glass': 'none',
      },
    },
  },
  plugins: [],
};
