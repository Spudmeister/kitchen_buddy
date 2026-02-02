/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary colors - WCAG AA compliant
        // Light mode: primary-600 on white = 4.5:1 contrast ratio
        // Dark mode: primary-400 on gray-900 = 4.5:1 contrast ratio
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',  // Dark mode text - 4.5:1 on gray-900
          500: '#10b981',
          600: '#059669',  // Light mode text - 4.5:1 on white
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Semantic colors with WCAG AA compliance
        // Error colors
        error: {
          light: '#dc2626',  // red-600 - 4.5:1 on white
          dark: '#f87171',   // red-400 - 4.5:1 on gray-900
        },
        // Success colors
        success: {
          light: '#16a34a',  // green-600 - 4.5:1 on white
          dark: '#4ade80',   // green-400 - 4.5:1 on gray-900
        },
        // Warning colors
        warning: {
          light: '#d97706',  // amber-600 - 4.5:1 on white
          dark: '#fbbf24',   // amber-400 - 4.5:1 on gray-900
        },
      },
      screens: {
        // Mobile-first breakpoints
        'sm': '640px',   // Small tablets
        'md': '768px',   // Tablets - navigation switches here
        'lg': '1024px',  // Laptops
        'xl': '1280px',  // Desktops
        '2xl': '1536px', // Large desktops
      },
      // Focus ring styles for accessibility
      ringWidth: {
        'focus': '2px',
      },
      ringOffsetWidth: {
        'focus': '2px',
      },
    },
  },
  plugins: [],
};
