import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Dedicated Vivona brand colors
        ivory: {
          DEFAULT: "#FBF7F0",
          50: "#FFFFFF",
          100: "#FDFCF9",
          200: "#FBF7F0",
          300: "#F3EAD9",
          400: "#EBDDC2",
        },
        maroon: {
          DEFAULT: "#6B1D2A",
          50: "#F7E8EB",
          100: "#EFC8CE",
          200: "#DE929E",
          300: "#CE5D6E",
          400: "#99293C",
          500: "#6B1D2A",
          600: "#551722",
          700: "#3E1119",
        },
        gold: {
          DEFAULT: "#C8A24A",
          50: "#FAF6EB",
          100: "#F3E8CA",
          200: "#E7CE8F",
          300: "#DCB555",
          400: "#C8A24A",
          500: "#A68434",
          600: "#836725",
        },
        charcoal: {
          DEFAULT: "#1F1A17",
          50: "#F6F5F4",
          100: "#E3E0DE",
          200: "#B8B3B0",
          300: "#8D8581",
          400: "#544C47",
          500: "#1F1A17",
          600: "#171311",
        },
        sage: {
          DEFAULT: "#6F8F72",
          50: "#F2F6F3",
          100: "#DDE8DE",
          200: "#B8D0BA",
          300: "#93B796",
          400: "#6F8F72",
          500: "#547057",
        },
        terracotta: {
          DEFAULT: "#B5533C",
          50: "#FAEEEB",
          100: "#F3D5CE",
          200: "#E39E90",
          300: "#D36752",
          400: "#B5533C",
          500: "#8D3E2C",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
