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
        brand: {
          purple: "#a855f7",
          blue: "#38bdf8",
          indigo: "#6366f1",
        },
        accent: {
          green: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
        ink: {
          main: "#f8fafc",
          // Increased from #94a3b8 for better WCAG contrast on dark bg
          muted: "#a8bbd0",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
      },
      boxShadow: {
        glow: "0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.04)",
        "glow-primary": "0 4px 24px rgba(56,189,248,0.18)",
        "glow-purple": "0 4px 24px rgba(168,85,247,0.20)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(244, 63, 94, 0.7)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 8px rgba(244, 63, 94, 0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(244, 63, 94, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        waveBar: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.5s infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "bounce-dot": "bounceDot 1.2s ease-in-out infinite",
        "wave-bar": "waveBar 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
