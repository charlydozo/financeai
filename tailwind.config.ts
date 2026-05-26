import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Brand (SMARTPLAN) strategy type colors — applied dynamically from TYPE_META
    'bg-brand-500/10', 'text-brand-400', 'border-brand-500/20',
    // Other strategy type colors
    'bg-blue-500/10',    'text-blue-400',    'border-blue-500/20',
    'bg-purple-500/10',  'text-purple-400',  'border-purple-500/20',
    'bg-amber-500/10',   'text-amber-400',   'border-amber-500/20',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        gray: {
          950: '#030712',
        },
        brand: {
          50:  '#eef5fb',
          100: '#d6e8f5',
          200: '#add1eb',
          300: '#70aadb',
          400: '#3b8cc4',
          500: '#02559F',
          600: '#014480',
          700: '#013363',
          800: '#012245',
          900: '#011128',
          950: '#000814',
        },
      },
    },
  },
  plugins: [],
};

export default config;
