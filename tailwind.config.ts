import type { Config } from 'tailwindcss';

/**
 * Sistema de diseno "Cyber-Workshop".
 * Los nombres son semanticos: el codigo dice "chalk", no "#FF66A1".
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mat: '#0A1913',      // mat de corte, verde profundo
        matlo: '#0F2A20',    // mat elevado
        mathi: '#15382B',    // bordes vivos
        chalk: '#FF66A1',    // tiza rosa / neon
        chalkd: '#E14C86',
        void: '#0D0E12',     // fondo base
        void2: '#14161C',    // superficie
        void3: '#1B1E26',    // superficie elevada
        line: '#252A35',
        ink: '#EDF2EF',
        muted: '#8A9BA4',
        amber: '#FFB627',
        jade: '#4ADE80',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        jp: ['var(--font-jp)', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(9px)' },
          to: { opacity: '1', transform: 'none' },
        },
        scanline: {
          '0%': { top: '0' },
          '100%': { top: '100%' },
        },
      },
      animation: {
        'fade-up': 'fade-up .28s cubic-bezier(.2,.8,.2,1)',
        scanline: 'scanline 1.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
