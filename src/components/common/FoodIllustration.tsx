import React from 'react';
import type { ProductIconType } from '../../types/pos';

interface Props {
  type?: ProductIconType;
  className?: string;
}

const PALETTES: Record<ProductIconType, { bg: string; accent: string }> = {
  rice: { bg: 'bg-orange-50 dark:bg-orange-950/40', accent: 'text-orange-600 dark:text-orange-400' },
  noodle: { bg: 'bg-amber-50 dark:bg-amber-950/40', accent: 'text-amber-600 dark:text-amber-400' },
  grill: { bg: 'bg-red-50 dark:bg-red-950/40', accent: 'text-red-600 dark:text-red-400' },
  soup: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', accent: 'text-yellow-700 dark:text-yellow-400' },
  coffee: { bg: 'bg-stone-100 dark:bg-stone-800', accent: 'text-stone-700 dark:text-stone-300' },
  tea: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', accent: 'text-emerald-700 dark:text-emerald-400' },
  juice: { bg: 'bg-orange-50 dark:bg-orange-950/40', accent: 'text-orange-500 dark:text-orange-300' },
  snack: { bg: 'bg-amber-50 dark:bg-amber-950/40', accent: 'text-amber-700 dark:text-amber-400' },
  dessert: { bg: 'bg-rose-50 dark:bg-rose-950/40', accent: 'text-rose-600 dark:text-rose-400' },
};

export const FoodIllustration: React.FC<Props> = ({ type = 'rice', className = 'w-12 h-12' }) => {
  const palette = PALETTES[type] || PALETTES.rice;

  return (
    <div className={`rounded-xl flex items-center justify-center shrink-0 ${palette.bg} ${palette.accent} ${className}`}>
      {type === 'rice' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 24c0-7.5 6.3-13 14-13s14 5.5 14 13H10z" fill="currentColor" fillOpacity="0.14" />
          <path d="M8 24h32c0 8.5-7.2 14-16 14S8 32.5 8 24z" />
          <path d="M18 16l2-3M24 14v-3M30 16l-2-3" />
        </svg>
      )}
      {type === 'noodle' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 24h30c0 8.3-6.7 14-15 14S9 32.3 9 24z" fill="currentColor" fillOpacity="0.14" />
          <path d="M14 24V12M20 24V10M26 24V12" />
          <path d="M12 12l24-3M12 16l24-2" />
        </svg>
      )}
      {type === 'grill' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="24" cy="28" rx="14" ry="8" fill="currentColor" fillOpacity="0.14" />
          <path d="M16 17c0-2 2-4 2-6M24 15c0-2 2-4 2-6M32 17c0-2 2-4 2-6" />
          <path d="M12 28h24" />
        </svg>
      )}
      {type === 'soup' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 23h28c0 8.5-6.3 14-14 14s-14-5.5-14-14z" fill="currentColor" fillOpacity="0.14" />
          <path d="M7 23h34" />
          <path d="M18 16c0-2 1.5-3 1.5-5M24 15c0-2 1.5-3 1.5-5M30 16c0-2 1.5-3 1.5-5" />
        </svg>
      )}
      {type === 'coffee' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 18h20v13a8 8 0 01-8 8h-4a8 8 0 01-8-8V18z" fill="currentColor" fillOpacity="0.14" />
          <path d="M32 20h4a4 4 0 010 8h-4" />
          <path d="M18 12c0-2 1.5-3 1.5-5M25 12c0-2 1.5-3 1.5-5" />
        </svg>
      )}
      {type === 'tea' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 14h20l-2.5 23a2 2 0 01-2 1.8H18.5a2 2 0 01-2-1.8L14 14z" fill="currentColor" fillOpacity="0.14" />
          <path d="M26 14l4-6h5" />
          <path d="M16 23h16" />
        </svg>
      )}
      {type === 'juice' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 16h18l-2 22H17l-2-22z" fill="currentColor" fillOpacity="0.14" />
          <circle cx="32" cy="14" r="5" />
          <path d="M22 16l-3-8" />
        </svg>
      )}
      {type === 'snack' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="11" y="18" width="26" height="16" rx="5" fill="currentColor" fillOpacity="0.14" />
          <path d="M17 24h4M27 24h4M22 29h4" />
        </svg>
      )}
      {type === 'dessert' && (
        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 28c0-6.6 5.4-12 12-12s12 5.4 12 12H12z" fill="currentColor" fillOpacity="0.14" />
          <path d="M10 32h28" />
          <circle cx="24" cy="13" r="3" />
        </svg>
      )}
    </div>
  );
};
