export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#ea7373',
        'background-dark': '#0a0a0a',
        'surface-dark': '#161616',
        accent: '#ea7373',
      },
      fontFamily: {
        display: ["'Be Vietnam Pro'", 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '4px',
        xl: '4px',
        full: '9999px',
      },
      keyframes: {
        progress: {
          '0%, 100%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(250%)' },
        },
      },
      animation: {
        progress: 'progress 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
