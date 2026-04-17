import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TRIGGER =
  'flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-3 text-left font-sans text-sm font-semibold uppercase tracking-wider text-white transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/35';

const LIST =
  'absolute z-[60] mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-700 bg-zinc-950 py-1 shadow-2xl ring-1 ring-black/40';

const OPTION =
  'w-full cursor-pointer px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-zinc-800';

const OPTION_ACTIVE = 'bg-zinc-800 text-white';

export interface LandingSelectProps {
  id?: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const LandingSelect: React.FC<LandingSelectProps> = ({
  id,
  name,
  options,
  value,
  onChange,
  required,
}) => {
  const genId = useId();
  const listboxId = id ?? `landing-select-${genId}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        id={listboxId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listboxId}-listbox`}
        className={TRIGGER}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          aria-labelledby={listboxId}
          className={LIST}
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`${OPTION} ${selected ? OPTION_ACTIVE : ''}`}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LandingSelect;
