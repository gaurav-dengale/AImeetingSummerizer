/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0f1d",
        surface: "rgba(18, 26, 47, 0.75)",
        border: "rgba(255, 255, 255, 0.08)",
        primary: "#38bdf8",
        indigo: "#6366f1",
        violet: "#a855f7",
        accent: {
          green: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
        ink: {
          main: "#f8fafc",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%)",
      },
      boxShadow: {
        glow: "0 10px 30px rgba(0, 0, 0, 0.25)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(244, 63, 94, 0.7)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 8px rgba(244, 63, 94, 0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(244, 63, 94, 0)" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.5s infinite",
      },
    },
  },
  plugins: [],
};
