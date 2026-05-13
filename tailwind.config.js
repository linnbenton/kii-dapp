/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "kii-dark": "#0b0114",
        "kii-purple": "#4c1d95",
        "kii-blue": "#2563eb",
        "kii-text-light": "#93c5fd",
      },
      backgroundImage: {
        "kii-gradient": "linear-gradient(to right, #2e1065, #1e40af, #3b82f6)",
      },
    },
  },
  plugins: [],
};
