// frontend/tailwind.config.js
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    "text-warmup",
    "text-work",
    "text-rest",
    "text-idle",
    "stroke-warmup",
    "stroke-work",
    "stroke-rest",
    "stroke-idle",
  ],
  theme: {
    extend: {
      colors: {
        warmup: "#FACC15", // jaune
        work: "#e42424ff", // rouge
        rest: "#22C55E", // vert
        idle: "#64748B", // gris
      },
    },
  },
  plugins: [],
};
