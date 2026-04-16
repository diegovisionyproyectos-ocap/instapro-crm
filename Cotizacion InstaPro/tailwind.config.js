/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        instapro: {
          blue: '#1e3a6e',
          yellow: '#f5a623',
          lightblue: '#e8f0fb',
        }
      }
    },
  },
  plugins: [],
}
