import type { CSSProperties } from 'react';
import type { AdminTheme } from './adminTheme';
import { cn } from './utils';

export type { AdminTheme as AppTheme } from './adminTheme';

export function isDarkTheme(theme: AdminTheme): boolean {
  return theme === 'dark';
}

/** Root page background for shell (matches AdminLayout and DashboardLayout). */
export function appPageBgClass(_isDark?: boolean): string {
  return 'bg-background text-foreground';
}

export function appPanelClass(_isDark?: boolean): string {
  return cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm');
}

export function appCardClass(_isDark?: boolean): string {
  return cn('rounded-xl border border-border bg-card text-card-foreground');
}

export function appKpiLinkClass(_isDark?: boolean, interactive = true): string {
  return cn(
    'rounded-xl border border-border bg-card text-card-foreground',
    interactive && 'transition-colors hover:border-ring/50'
  );
}

export function appHeadingClass(_isDark?: boolean, size: 'h2' | 'h3' = 'h3'): string {
  const sz = size === 'h2' ? 'text-2xl font-semibold tracking-tight' : 'text-sm font-semibold';
  return cn(sz, 'text-foreground');
}

export function appSubheadingClass(_isDark?: boolean): string {
  return 'text-muted-foreground';
}

export function appMutedTextClass(_isDark?: boolean): string {
  return 'text-muted-foreground';
}

export function appKpiValueClass(_isDark?: boolean): string {
  return 'text-2xl font-bold text-foreground';
}

export function appIconWellClass(_isDark?: boolean): string {
  return 'rounded-lg bg-muted p-2 text-muted-foreground';
}

export function appBorderDividerClass(_isDark?: boolean): string {
  return 'border-border';
}

export function appSuccessBannerClass(_isDark?: boolean): string {
  return 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
}

export function appErrorBannerClass(_isDark?: boolean): string {
  return 'rounded-lg border border-destructive/30 bg-destructive/10 text-destructive';
}

export function appLinkMutedClass(_isDark?: boolean): string {
  return 'text-muted-foreground hover:text-foreground transition-colors';
}

export function appInputClass(_isDark?: boolean): string {
  return cn(
    'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs',
    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
  );
}

export function appOutlineButtonClass(_isDark?: boolean): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium',
    'shadow-xs hover:bg-accent hover:text-accent-foreground',
    'disabled:pointer-events-none disabled:opacity-50'
  );
}

export function rechartsTooltipProps(isDark: boolean): { contentStyle: CSSProperties; itemStyle?: CSSProperties } {
  return isDark
    ? {
        contentStyle: { backgroundColor: '#18181b', borderColor: '#27272a', color: '#fafafa' },
        itemStyle: { color: '#fafafa' },
      }
    : {
        contentStyle: { backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b' },
        itemStyle: { color: '#18181b' },
      };
}

export function rechartsAxisStroke(_isDark?: boolean): string {
  return 'hsl(var(--muted-foreground))';
}
