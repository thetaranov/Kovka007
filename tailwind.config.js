/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}", // Сканирует файлы в корне (App.tsx, index.tsx)
    "./components/**/*.{js,ts,jsx,tsx}", // Сканирует папку components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
