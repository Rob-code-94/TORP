import React, { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';

interface SquareInvoiceActionsProps {
  isDark: boolean;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
  squareInvoiceId?: string | null;
  compact?: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const SquareInvoiceActions: React.FC<SquareInvoiceActionsProps> = ({
  isDark,
  invoiceUrl,
  invoiceNumber,
  squareInvoiceId,
  compact = false,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const btnClass = compact
    ? isDark
      ? 'inline-flex items-center justify-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:text-white'
      : 'inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800'
    : isDark
      ? 'inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white'
      : 'inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800';

  const onCopy = async (key: string, text: string) => {
    const ok = await copyText(text);
    setCopied(ok ? key : 'err');
    window.setTimeout(() => setCopied(null), 2000);
  };

  if (!invoiceUrl && !invoiceNumber && !squareInvoiceId) {
    return <p className="text-xs text-zinc-500">No hosted Square invoice yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap min-w-0">
      {invoiceUrl && (
        <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
          <ExternalLink size={compact ? 12 : 14} />
          Open in Square
        </a>
      )}
      {invoiceUrl && (
        <button type="button" className={btnClass} onClick={() => void onCopy('link', invoiceUrl)}>
          <Copy size={compact ? 12 : 14} />
          {copied === 'link' ? 'Copied' : 'Copy payment link'}
        </button>
      )}
      {(invoiceNumber || squareInvoiceId) && (
        <button
          type="button"
          className={btnClass}
          onClick={() => void onCopy('num', invoiceNumber || squareInvoiceId || '')}
        >
          <Copy size={compact ? 12 : 14} />
          {copied === 'num' ? 'Copied' : invoiceNumber ? `Invoice #${invoiceNumber}` : 'Copy invoice ID'}
        </button>
      )}
      {copied === 'err' && <p className="text-xs text-rose-400 w-full">Could not copy to clipboard.</p>}
    </div>
  );
};

export default SquareInvoiceActions;
