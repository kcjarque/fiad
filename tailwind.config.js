/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        champagne: '#D4AF7A',
        plum: '#3E2A3E',
        cream: '#FAF6F0',
        rose: '#E8B4B8',
        coral: '#E8826B',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'ui-serif', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(62, 42, 62, 0.08)',
        card: '0 2px 10px rgba(62, 42, 62, 0.06)',
      },
    },
  },
  plugins: [],
};
