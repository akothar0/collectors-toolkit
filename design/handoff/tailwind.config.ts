// handoff/tailwind.config.ts
//
// REPLACES: tailwind.config.ts
//
// Editorial token system. Drops the existing slate/indigo brand palette in
// favour of paper/ink/cinnabar.

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces & ink
        paper:       '#f6f4ef',
        surface:     '#ffffff',
        'surface-2': '#fbfaf6',
        ink:         '#14110d',
        'ink-2':     '#5c594f',
        'ink-3':     '#8a867b',
        'ink-4':     '#b5b1a6',
        rule:        '#e4e0d5',
        'rule-soft': '#efeae0',

        // Accent & status
        accent:   '#b8531a',
        gold:     '#c89a3b',
        positive: '#2f6f4a',
        negative: '#b23a2e',
        warn:     '#a37a14',

        // Grading-company label colors (use ONLY on slab labels)
        psa: '#c41e3a',
        bgs: '#101935',
        sgc: '#1d3e8b',
      },
      fontFamily: {
        // Wired up via next/font/google in src/app/layout.tsx — see handoff/layout.tsx.
        sans:  ['var(--font-geist)',         'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-instrument)',    'ui-serif',      'Georgia'],
        mono:  ['var(--font-geist-mono)',    'ui-monospace',  'SFMono-Regular'],
      },
      letterSpacing: {
        eyebrow:   '0.18em',
        'eyebrow-tight': '0.12em',
        tightest:  '-0.04em',
      },
      boxShadow: {
        soft:     '0 1px 2px rgba(20,17,13,0.06), 0 10px 30px rgba(20,17,13,0.06)',
        popover:  '0 12px 32px rgba(20,17,13,0.12)',
        slab:     '0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.04) inset, 0 8px 22px rgba(20,17,13,0.10), 0 2px 6px rgba(20,17,13,0.06)',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      backgroundImage: {
        // Removed gradient noise; the canvas is a flat warm paper.
      },
    },
  },
  plugins: [],
};

export default config;
