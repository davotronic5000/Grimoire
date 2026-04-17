import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Blood on the Clocktower design system
        botc: {
          bg:          '#0a0a0f',
          surface:     '#12101e',
          raised:      '#1a1530',
          border:      '#2d1f4a',
          'border-bright': '#4a3570',
          gold:        '#c9a84c',
          'gold-dim':  '#8a6f30',
          crimson:     '#8b1a1a',
          text:        '#e8dcc8',
          muted:       '#9a8a78',
          subtle:      '#5a4e42',
          night:       '#818cf8',
          day:         '#fbbf24',
          // Team colours
          townsfolk:   '#3b82f6',
          outsider:    '#22d3ee',
          minion:      '#fb923c',
          demon:       '#ef4444',
          traveler:    '#a855f7',
          fabled:      '#f59e0b',
          loric:       '#10b981',
        },
      },
      screens: {
        'ipad':     '768px',
        'ipad-pro': '1024px',
      },
      fontFamily: {
        gothic: ['Georgia', "'Times New Roman'", 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
