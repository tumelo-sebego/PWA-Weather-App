// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode based on 'dark' class
  theme: {
    extend: {
      // You can extend Tailwind's default theme here if needed
      // For instance, custom fonts or colors
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Example, you might use a font like Inter
      }
    },
  },
  plugins: [],
}