/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E8593C',
          light: '#F2A623',
          dark: '#B03A22',
        },
        surface: {
          DEFAULT: '#0F0F0F',
          card: '#1A1A1A',
          elevated: '#242424',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#5A5A5A',
        },
      },
      borderRadius: {
        card: '16px',
        chip: '999px',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
