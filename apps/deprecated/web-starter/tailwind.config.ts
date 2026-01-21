import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Accessible color palette with AA+ contrast
        primary: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#b9dfff",
          300: "#7cc4ff",
          400: "#36a5ff",
          500: "#0c85eb",
          600: "#0068c9",
          700: "#0052a3",
          800: "#054686",
          900: "#0a3b6f",
          950: "#07254a",
        },
        // High contrast mode colors
        contrast: {
          bg: "#000000",
          text: "#ffffff",
          link: "#ffff00",
          focus: "#00ffff",
        },
      },
      fontFamily: {
        // Accessible, readable fonts
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        // Dyslexia-friendly option (user can toggle)
        dyslexic: ["OpenDyslexic", "Comic Sans MS", "sans-serif"],
      },
      fontSize: {
        // Larger base sizes for accessibility
        base: ["1.125rem", { lineHeight: "1.75" }], // 18px
        lg: ["1.25rem", { lineHeight: "1.75" }], // 20px
        xl: ["1.5rem", { lineHeight: "1.6" }], // 24px
      },
      spacing: {
        // Extra spacing options for readability
        "line-relaxed": "2rem",
        "line-loose": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

