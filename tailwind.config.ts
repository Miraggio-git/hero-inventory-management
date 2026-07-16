import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F7F9",
        ink: "#111214",
        line: "#E8EAEE",
        sub: "#6B7280",
        brand: { DEFAULT: "#4F46E5", soft: "#EEF0FE" },
        ok: { DEFAULT: "#16A34A", bg: "#E8F7EE" },
        watch: { DEFAULT: "#2563EB", bg: "#E8EFFD" },
        low: { DEFAULT: "#D97706", bg: "#FCF1DD" },
        crit: { DEFAULT: "#DC2626", bg: "#FCE9E9" }
      },
      fontFamily: { sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"], mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
      boxShadow: { card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)" },
      borderRadius: { xl2: "14px" }
    }
  },
  plugins: []
};
export default config;
