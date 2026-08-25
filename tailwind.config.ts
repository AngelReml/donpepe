import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brasa: {
          50: "#fdf3ee",
          100: "#f7d9c8",
          200: "#efb394",
          300: "#e58a5b",
          400: "#dc6a31",
          500: "#c84a14",
          600: "#a1370d",
          700: "#7a290a",
          800: "#531c08",
          900: "#2d0f05",
        },
        carbon: {
          50: "#f5f5f4",
          100: "#e7e5e4",
          200: "#cfcbca",
          300: "#a8a29f",
          400: "#78716c",
          500: "#57534e",
          600: "#3f3b38",
          700: "#2b2826",
          800: "#1a1817",
          900: "#0f0e0d",
        },
        ambar: {
          400: "#f4b400",
          500: "#d49a00",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      boxShadow: {
        "brasa": "0 10px 30px -10px rgba(200, 74, 20, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
