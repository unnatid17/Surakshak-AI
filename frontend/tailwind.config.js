/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F2C4C",
        navyLight: "#1C3F63",
        teal: "#0E7C86",
        warnAmber: "#D97706",
        critRed: "#DC2626",
        okGreen: "#16A34A",
      },
    },
  },
  plugins: [],
};
