/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",          // Файлы в корне (App.tsx)
    "./components/**/*.{js,ts,jsx,tsx}", // Файлы в компонентах
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}