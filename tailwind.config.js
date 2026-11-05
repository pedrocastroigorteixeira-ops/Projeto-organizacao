/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D0D0F',
        surface: '#141419',
        'surface-hover': '#1C1C24',
        card: '#1A1A22',
        'card-hover': '#22222D',
        border: '#272733',
        'border-focus': '#3B3B4D',
        frentes: {
          divino: '#F59E0B',
          bendito: '#EF4444',
          projetos: '#8B5CF6',
          pessoal: '#06B6D4',
        },
      },
    },
  },
  plugins: [],
};
