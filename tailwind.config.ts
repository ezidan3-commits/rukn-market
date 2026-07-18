import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B1712',
          light: '#2A241C',
          dark: '#100D09',
        },
        gold: {
          DEFAULT: '#D97B2E',
          light: '#F0A462',
          dark: '#A85D1E',
        },
        cream: '#F5EEE2',
      },
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
