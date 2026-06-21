import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#071f3d',
          light: '#0d2d57',
          dark: '#040f1e',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#e2c97e',
          dark: '#9e7a28',
        },
        cream: '#F8F6F0',
      },
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
