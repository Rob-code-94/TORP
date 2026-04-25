import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarOff, KeyRound, Mail, Settings } from 'lucide-react';
import type { AuthUser } from '../../lib/auth';
import { hqUserInitials } from '../../lib/hqUserDisplay';
import { showAdminOrgSettingsLink } from '../../lib/hqProfileMenuConfig';
import { UserRole } from '../../types';

export type HqProfileMenuVariant = 'admin' | 'staff';

const MENU_PANEL_W = 288;

function roleLabel(role: AuthUser['role']): string {
  switch (role) {
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.PROJECT_MANAGER:
      return 'Project manager';
    case UserRole.STAFF:
      return 'Staff';
    case UserRole.CLIENT:
      return 'Client';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

interface HqProfileMenuClusterProps {
  variant: HqProfileMenuVariant;
  user: AuthUser | null;
  isDark: boolean;
  pathname?: string;
  updateSessionProfile: (patch: Partial<Pick<AuthUser, 'displayName' | 'email'>>) => void;
}

const HqProfileMenuCluster: React.FC<HqProfileMenuClusterProps> = ({
  variant,
  user,
  isDark,
  pathname,
  updateSessionProfile,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [fixedStyle, setFixedStyle] = useState<{ top: number; left: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [modal, setModal] = useState<'none' | 'reset' | 'email' | 'timeoff'>('none');
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [timeNote, setTimeNote] = useState('');

  const initials = hqUserInitials(user);
  const displayName = user?.displayName?.trim() || 'Account';
  const email = user?.email?.trim();
  const menuId = 'hq-profile-menu-panel';

  const syncPosition = useCallback(() => {
    if (!open || !btnRef.current) {
      setFixedStyle(null);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - MENU_PANEL_W, window.innerWidth - MENU_PANEL_W - 8));
    setFixedStyle({ top: r.bottom + 8, left });
  }, [open]);

  useLayoutEffect(() => {
    syncPosition();
  }, [open, syncPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => syncPosition();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open, syncPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setModal('none');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menuId]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (modal === 'none') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal('none');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal]);

  const openEmailModal = () => {
    setEmailDraft(email || '');
    setEmailError(null);
    setOpen(false);
    setModal('email');
  };

  const submitEmail = () => {
    if (!isValidEmail(emailDraft)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    updateSessionProfile({ email: emailDraft.trim().toLowerCase() });
    setFlash('Email updated (demo; stored in this browser session only).');
    setModal('none');
    setOpen(false);
  };

  const submitReset = () => {
    const target = email || 'your account email';
    setFlash(`Demo: a password reset would be sent to ${target}.`);
    setModal('none');
    setOpen(false);
  };

  const submitTimeOff = () => {
    setFlash('Demo: time-off request recorded locally (no manager workflow yet).');
    setModal('none');
    setTimeStart('');
    setTimeEnd('');
    setTimeNote('');
    setOpen(false);
  };

  const panelSurface = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl'
    : 'border-zinc-200 bg-white text-zinc-900 shadow-xl';

  const itemBtn = isDark
    ? 'w-full text-left px-3 py-2.5 text-sm rounded-lg text-zinc-200 hover:bg-zinc-800/80'
    : 'w-full text-left px-3 py-2.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100';

  const dialogBtnSecondary = isDark
    ? 'rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800'
    : 'rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-800 hover:bg-zinc-100';

  const showSettings = variant === 'admin' && user && showAdminOrgSettingsLink(user.role);

  if (!user) {
    return (
      <div
        className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
          isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-800'
        }`}
        title="Not signed in"
      >
        …
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-opacity ${
          isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:opacity-90' : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:opacity-90'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={`${displayName} — ${roleLabel(user.role)}`}
        aria-label={`Account menu for ${displayName}, ${roleLabel(user.role)}`}
        onClick={() => setOpen((v) => !v)}
      >
        {initials}
      </button>

      {open && fixedStyle && (
        <div
          id={menuId}
          role="menu"
          className={`fixed z-[100] w-[min(18rem,calc(100vw-1rem))] max-w-[min(18rem,calc(100vw-1rem))] min-w-0 rounded-xl border p-3 ${panelSurface}`}
          style={{ top: fixedStyle.top, left: fixedStyle.left, width: MENU_PANEL_W }}
        >
          {flash && (
            <p className="mb-2 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-2 py-1.5 text-[11px] text-emerald-200/90">
              {flash}
              <button
                type="button"
                className="ml-2 underline font-semibold"
                onClick={() => setFlash(null)}
              >
                Dismiss
              </button>
            </p>
          )}
          <div className="min-w-0 border-b border-zinc-700/50 pb-2 mb-2">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{email || 'No email on file'}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{roleLabel(user.role)}</p>
          </div>
          <div className="space-y-0.5" role="none">
            <button
              type="button"
              role="menuitem"
              className={itemBtn}
              onClick={() => {
                setOpen(false);
                setModal('reset');
              }}
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound size={14} className="shrink-0 opacity-70" />
                Reset password
              </span>
            </button>
            <button type="button" role="menuitem" className={itemBtn} onClick={openEmailModal}>
              <span className="inline-flex items-center gap-2">
                <Mail size={14} className="shrink-0 opacity-70" />
                Change email
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemBtn}
              onClick={() => {
                setOpen(false);
                setModal('timeoff');
              }}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarOff size={14} className="shrink-0 opacity-70" />
                Request time off
              </span>
            </button>
            {showSettings && (
              <Link
                role="menuitem"
                to="/hq/admin/settings"
                className={`${itemBtn} flex items-center gap-2`}
                onClick={() => setOpen(false)}
              >
                <Settings size={14} className="shrink-0 opacity-70" />
                Open org settings
              </Link>
            )}
          </div>
          <p className="mt-2 text-[10px] text-zinc-500 leading-snug">Demo actions only — no email is sent.</p>
        </div>
      )}

      {modal === 'reset' && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={() => setModal('none')}
        >
          <div className={`w-full max-w-sm rounded-xl border p-4 ${panelSurface}`} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-2">Reset password?</h3>
            <p className="text-xs text-zinc-500 mb-4">
              This is a demo. In production, TORP would email a reset link to {email || 'your address'}.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={dialogBtnSecondary} onClick={() => setModal('none')}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
                onClick={submitReset}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'email' && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={() => setModal('none')}
        >
          <div className={`w-full max-w-sm rounded-xl border p-4 ${panelSurface}`} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-2">Change email</h3>
            <label className="block text-[11px] uppercase text-zinc-500 mb-1">Email</label>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => {
                setEmailDraft(e.target.value);
                setEmailError(null);
              }}
              className="w-full min-w-0 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm mb-1"
            />
            {emailError && <p className="text-xs text-red-400 mb-2">{emailError}</p>}
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" className={dialogBtnSecondary} onClick={() => setModal('none')}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
                onClick={submitEmail}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'timeoff' && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={() => setModal('none')}
        >
          <div className={`w-full max-w-sm rounded-xl border p-4 ${panelSurface}`} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-2">Request time off</h3>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-[11px] uppercase text-zinc-500">
                Start
                <input
                  type="date"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-[11px] uppercase text-zinc-500">
                End
                <input
                  type="date"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-[11px] uppercase text-zinc-500">
                Note
                <textarea
                  value={timeNote}
                  onChange={(e) => setTimeNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" className={dialogBtnSecondary} onClick={() => setModal('none')}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
                onClick={submitTimeOff}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HqProfileMenuCluster;
