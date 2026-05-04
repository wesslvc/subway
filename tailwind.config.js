/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        barlow: ['"Barlow Condensed"', 'sans-serif'],
      },
      colors: {
        'subway-bg': '#0D0D0D',
        'subway-card': '#1A1A1A',
        'subway-border': '#2A2A2A',
        'subway-text': '#FFFFFF',
        'subway-muted': '#888888',
        'subway-accent': '#4A90E2',
        'line-1': '#0052A4',
        'line-2': '#00A84D',
        'line-3': '#EF7C1C',
        'line-4': '#00A4E3',
        'line-5': '#996CAC',
        'line-6': '#CD7C2F',
        'line-7': '#747F00',
        'line-8': '#E6186C',
        'line-9': '#BDB092',
      },
    },
  },
  plugins: [],
};
