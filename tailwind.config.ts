import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ml: {
          yellow: '#FFE600',
          blue: '#3483FA',
          dark: '#1A1A2E',
        },
      },
    },
  },
  plugins: [],
};
export default config;
