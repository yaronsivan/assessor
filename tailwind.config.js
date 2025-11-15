/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Open Sans', 'system-ui', 'sans-serif'],
        'pixel': ['"Press Start 2P"', 'cursive'],
      },
      colors: {
        'genie-purple': '#6B46C1',
        'genie-blue': '#4299E1',
        'genie-gold': '#F6AD55',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 1.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideUp: {
          '0%': { transform: 'translateY(calc(100vh + 200px))', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px rgba(0, 0, 0, 0.25)',
        'pixel-sm': '2px 2px 0px 0px rgba(0, 0, 0, 0.25)',
        'pixel-lg': '6px 6px 0px 0px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
}
