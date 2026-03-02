/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        headline: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Newsreader', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: '#2E7D32',
          mid: '#388E3C',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          warm: '#8BC34A',
          gold: '#F9A825',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          base: '#FAFAF7',
          card: '#FFFFFF',
          muted: '#F1F8E9',
          border: '#D8EDD5',
        },
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '20px',
        'xl': '28px',
        '2xl': '36px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(27,94,32,0.08)',
        'md': '0 4px 16px rgba(27,94,32,0.12)',
        'lg': '0 8px 32px rgba(27,94,32,0.16)',
        'xl': '0 20px 60px rgba(27,94,32,0.2)',
        'card': '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(27,94,32,0.14)',
      },
      animation: {
        'float': 'float-y 4s ease-in-out infinite',
        'float-slow': 'float-y-slow 6s ease-in-out infinite',
        'marquee': 'marquee-scroll 28s linear infinite',
        'reveal-up': 'reveal-up 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
      keyframes: {
        'float-y': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-y-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-8px) rotate(2deg)' },
        },
        'marquee-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'reveal-up': {
          from: { transform: 'translateY(60px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(102, 187, 106, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(102, 187, 106, 0)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(105deg, rgba(27,94,32,0.88) 0%, rgba(46,125,50,0.72) 40%, rgba(56,142,60,0.35) 70%, transparent 100%)',
        'card-gradient': 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
        'green-radial': 'radial-gradient(ellipse at 60% 40%, #E8F5E9 0%, #FAFAF7 70%)',
      },
    },
  },
  plugins: [],
};