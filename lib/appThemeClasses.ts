import type { CSSProperties } from 'react';
import type { AdminTheme } from './adminTheme';

export type { AdminTheme as AppTheme } from './adminTheme';

export function isDarkTheme(theme: AdminTheme): boolean {
  return theme === 'dark';
}

/** Root page background for shell (matches AdminLayout and DashboardLayout). */
export function appPageBgClass(isDark: boolean): string {
  return isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900';
}

export function appPanelClass(isDark: boolean): string {
  return isDark
    ? 'border border-zinc-800 bg-zinc-900/30'
    : 'border border-zinc-200 bg-white shadow-[0_1px_0_0_rgba(24,24,27,0.04)]';
}

export function appCardClass(isDark: boolean): string {
  return isDark
    ? 'bg-zinc-900/50 border border-zinc-800'
    : 'bg-white border border-zinc-200';
}

export function appKpiLinkClass(isDark: boolean, interactive = true): string {
  const base = isDark
    ? 'bg-zinc-900/50 border border-zinc-800'
    : 'bg-white border border-zinc-200';
  const hover = interactive ? (isDark ? ' hover:border-zinc-700' : ' hover:border-zinc-300') : '';
  return base + hover + (interactive ? ' transition-colors' : '');
}

export function appHeadingClass(isDark: boolean, size: 'h2' | 'h3' = 'h3'): string {
  const sz = size === 'h2' ? 'text-2xl font-bold' : 'text-sm font-semibold';
  return `${sz} ${isDark ? 'text-white' : 'text-zinc-900'}`;
}

export function appSubheadingClass(isDark: boolean): string {
  return isDark ? 'text-zinc-500' : 'text-zinc-600';
}

export function appMutedTextClass(isDark: boolean): string {
  return isDark ? 'text-zinc-500' : 'text-zinc-600';
}

export function appKpiValueClass(isDark: boolean): string {
  return isDark ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-zinc-900';
}

export function appIconWellClass(isDark: boolean): string {
  return isDark ? 'p-2 bg-zinc-800/80 rounded-lg text-zinc-300' : 'p-2 bg-zinc-100 rounded-lg text-zinc-600';
}

export function appBorderDividerClass(isDark: boolean): string {
  return isDark ? 'border-zinc-800' : 'border-zinc-200';
}

export function appSuccessBannerClass(isDark: boolean): string {
  return isDark
    ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-200'
    : 'border border-emerald-200 bg-emerald-50 text-emerald-900';
}

export function appErrorBannerClass(isDark: boolean): string {
  return isDark
    ? 'border-red-900/40 bg-red-950/20 text-red-200'
    : 'border border-red-200 bg-red-50 text-red-800';
}

export function appLinkMutedClass(isDark: boolean): string {
  return isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-600 hover:text-zinc-900';
}

export function appInputClass(isDark: boolean): string {
  return isDark
    ? 'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100'
    : 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900';
}

export function appOutlineButtonClass(isDark: boolean): string {
  return isDark
    ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:text-zinc-500 disabled:border-zinc-800 disabled:cursor-not-allowed hover:bg-zinc-800/60'
    : 'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 disabled:cursor-not-allowed hover:bg-zinc-100';
}

export function rechartsTooltipProps(isDark: boolean): { contentStyle: CSSProperties; itemStyle?: CSSProperties } {
  return isDark
    ? {
        contentStyle: { backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' },
        itemStyle: { color: '#fff' },
      }
    : {
        contentStyle: { backgroundColor: '#fff', borderColor: '#e4e4e7', color: '#18181b' },
        itemStyle: { color: '#18181b' },
      };
}

export function rechartsAxisStroke(isDark: boolean): string {
  return isDark ? '#52525b' : '#a1a1aa';
}
