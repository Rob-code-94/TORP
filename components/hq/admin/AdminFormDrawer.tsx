import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAdminTheme } from '../../../lib/adminTheme';

interface AdminFormDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const AdminFormDrawer: React.FC<AdminFormDrawerProps> = ({ open, title, subtitle, onClose, children, footer }) => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/70" aria-label="Close drawer" />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] max-w-[100vw] border-l flex flex-col ${
          isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-white'
        }`}
      >
        <div
          className={`sticky top-0 z-10 border-b px-4 py-3 flex items-start justify-between gap-3 ${
            isDark ? 'border-zinc-800 bg-zinc-950/95' : 'border-zinc-300 bg-white/95'
          }`}
        >
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{title}</h3>
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md border ${isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-300 text-zinc-600'}`}
            aria-label="Close drawer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-w-0">{children}</div>
        {footer && (
          <div
            className={`sticky bottom-0 z-10 border-t px-4 py-3 ${
              isDark ? 'border-zinc-800 bg-zinc-950/95' : 'border-zinc-300 bg-white/95'
            }`}
          >
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
};

export default AdminFormDrawer;
