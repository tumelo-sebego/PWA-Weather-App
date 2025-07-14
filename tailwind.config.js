/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { mono: ['SF Mono', 'ui-monospace', 'monospace'] }
    }
  },
  plugins: []
}