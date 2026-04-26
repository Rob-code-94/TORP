import React from 'react';
import { CheckCircle2, CircleDashed, AlertTriangle, Clock3, Hourglass } from 'lucide-react';
import { appPanelClass } from '../../../lib/appThemeClasses';
import type { IntegrationStatus } from '../../../lib/integrations/registry';

interface IntegrationCardProps {
  isDark: boolean;
  title: string;
  blurb: string;
  status: IntegrationStatus;
  /** Short subtitle line (e.g. connected email or "Not connected"). */
  statusLine?: string;
  /** Last sync / rotation timestamp text. */
  lastUpdatedText?: string;
  /** Friendly error string. Render below the controls in red. */
  errorText?: string;
  /** Card body controls (toggles, buttons). */
  children: React.ReactNode;
}

function StatusPill({ status, isDark }: { status: IntegrationStatus; isDark: boolean }) {
  const tone = pillTone(status, isDark);
  const Icon = pillIcon(status);
  const label = pillLabel(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      aria-label={`Integration status: ${label}`}
    >
      <Icon size={12} className="shrink-0" />
      {label}
    </span>
  );
}

function pillTone(status: IntegrationStatus, isDark: boolean): string {
  switch (status) {
    case 'connected':
      return isDark
        ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'not_connected':
      return isDark
        ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
        : 'border-zinc-200 bg-zinc-50 text-zinc-700';
    case 'error':
      return isDark
        ? 'border-red-700/50 bg-red-950/40 text-red-200'
        : 'border-red-200 bg-red-50 text-red-800';
    case 'pending':
      return isDark
        ? 'border-amber-700/50 bg-amber-950/40 text-amber-200'
        : 'border-amber-200 bg-amber-50 text-amber-800';
    case 'coming_soon':
      return isDark
        ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
        : 'border-zinc-200 bg-zinc-50 text-zinc-500';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function pillIcon(status: IntegrationStatus) {
  switch (status) {
    case 'connected':
      return CheckCircle2;
    case 'not_connected':
      return CircleDashed;
    case 'error':
      return AlertTriangle;
    case 'pending':
      return Hourglass;
    case 'coming_soon':
      return Clock3;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function pillLabel(status: IntegrationStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'not_connected':
      return 'Not connected';
    case 'error':
      return 'Action needed';
    case 'pending':
      return 'Pending';
    case 'coming_soon':
      return 'Coming soon';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  isDark,
  title,
  blurb,
  status,
  statusLine,
  lastUpdatedText,
  errorText,
  children,
}) => {
  return (
    <section className={`rounded-xl p-4 sm:p-5 min-w-0 space-y-3 ${appPanelClass(isDark)}`}>
      <header className="flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <h3
            className={`text-sm font-bold tracking-tight truncate ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            {title}
          </h3>
          <StatusPill status={status} isDark={isDark} />
        </div>
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{blurb}</p>
        {(statusLine || lastUpdatedText) && (
          <p
            className={`text-xs break-words ${
              isDark ? 'text-zinc-400' : 'text-zinc-700'
            }`}
          >
            {statusLine}
            {statusLine && lastUpdatedText ? <span className="text-zinc-500"> · </span> : null}
            {lastUpdatedText}
          </p>
        )}
      </header>

      <div className="space-y-3">{children}</div>

      {errorText && (
        <p
          className={`rounded-md border px-3 py-2 text-xs ${
            isDark
              ? 'border-red-900/50 bg-red-950/30 text-red-200'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
          role="alert"
        >
          {errorText}
        </p>
      )}
    </section>
  );
};

/** Loading skeleton for an integration card (used while the registry's data fetcher resolves). */
export const IntegrationCardSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div
    className={`rounded-xl p-4 sm:p-5 min-w-0 space-y-3 motion-safe:animate-pulse ${appPanelClass(isDark)}`}
    aria-hidden
  >
    <div
      className={`h-4 w-32 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}
    />
    <div
      className={`h-3 w-48 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}
    />
    <div className="flex gap-2">
      <div className={`h-8 w-28 rounded-md ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      <div className={`h-8 w-24 rounded-md ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
    </div>
  </div>
);

export default IntegrationCard;
