/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Playfair Display', 'serif']
      },
      colors: {
        sage: {
          50: '#f7faf4',
          100: '#edf4e8',
          200: '#dcebd3',
          300: '#bfd8b0',
          400: '#98bd85',
          500: '#739f62',
          600: '#587f49',
          700: '#45643b',
          800: '#3a5133',
          900: '#31442c'
        },
        sand: {
          50: '#fffaf2',
          100: '#f8ecd9',
          200: '#edd8b7',
          300: '#ddbd8a',
          400: '#cda265',
          500: '#bc8849'
        },
        mist: '#e9f1ef',
        ink: '#24312e'
      },
      boxShadow: {
        soft: '0 24px 80px rgba(70, 90, 82, 0.16)',
        lift: '0 18px 45px rgba(70, 90, 82, 0.12)'
      }
    }
  },
  plugins: []
};
