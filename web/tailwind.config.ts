import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#eff9ff",
          100: "#d8f1ff",
          200: "#b4e3ff",
          300: "#85d0ff",
          400: "#54b6ff",
          500: "#2a94ff",
          600: "#1575ef",
          700: "#115dd0",
          800: "#134fa5",
          900: "#14437f",
          950: "#0d2b50"
        }
      }
    }
  },
  plugins: []
};

export default config;
