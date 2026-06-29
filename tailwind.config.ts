import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        violet: '#6D28D9',
        pink: '#FF3D7F',
        bg: {
          DEFAULT: '#110F16',
          2: '#16131D',
        },
        card: '#191622',
        line: '#272232',
        ink: '#F4F1FA',
        mut: '#A79FB8',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'octogone-grad': 'linear-gradient(135deg, #6D28D9, #C026D3, #FF3D7F)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
