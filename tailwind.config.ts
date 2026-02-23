import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NovaNet brand palette
        nova: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d0ff',
          300: '#93aaff',
          400: '#6680ff',
          500: '#4757f5', // primary
          600: '#3740e0',
          700: '#2d32c0',
          800: '#272c9a',
          900: '#252a7a',
          950: '#161847',
        },
        accent: {
          50:  '#fff0fb',
          100: '#ffe0f7',
          200: '#ffc0ef',
          300: '#ff90df',
          400: '#ff56c8',
          500: '#f530b0', // accent / gradient end
          600: '#d91890',
          700: '#b50d72',
          800: '#950e5d',
          900: '#7c1050',
        },
      },
      backgroundImage: {
        'nova-gradient': 'linear-gradient(135deg, #4757f5, #f530b0)',
        'nova-gradient-dark': 'linear-gradient(135deg, #2d32c0, #d91890)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
