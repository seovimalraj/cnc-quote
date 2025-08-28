/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#674299',
          50: '#f3f1f7',
          100: '#e8e2ef',
          200: '#d1c5e0',
          300: '#b9a7d1',
          400: '#a289c2',
          500: '#8b6bb3',
          600: '#674299', // Brand color
          700: '#553680',
          800: '#432a67',
          900: '#301d4e',
        }
      }
    }
  },
  plugins: [],
}
