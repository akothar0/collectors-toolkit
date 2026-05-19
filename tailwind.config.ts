import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080808',
          900: '#111111',
          800: '#1c1c1c',
          700: '#2a2a2a',
          600: '#383838',
          500: '#484848',
        },
        ash: {
          50:  '#f8f8f8',
          100: '#ebebeb',
          200: '#d0d0d0',
          300: '#a8a8a8',
          400: '#787878',
          500: '#545454',
        },
        brand: {
          50:  '#fff4ee',
          100: '#ffe6d5',
          200: '#ffc8a0',
          300: '#ffa060',
          400: '#ff7028',
          500: '#ff5500',
          600: '#e54900',
          700: '#c03d00',
          800: '#963000',
          900: '#6e2400',
        },
      },
      fontFamily: {
        sans: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
