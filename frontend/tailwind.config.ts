import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182026",
        paper: "#f5f2ea",
        sage: "#9bb8a4",
        cedar: "#b86543",
        steel: "#55798d",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(24, 32, 38, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
