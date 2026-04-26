import React, { useState } from 'react';
import { Play, MessageSquare, CheckCircle, Download, CreditCard } from 'lucide-react';
import { MOCK_INVOICES } from '../../constants';
import { useAdminTheme } from '../../lib/adminTheme';
import { appInputClass, appPanelClass } from '../../lib/appThemeClasses';

const ClientView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'invoices'>('approvals');
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const tabActive = (on: boolean) =>
    on
      ? isDark
        ? 'text-white border-b-2 border-white'
        : 'text-zinc-900 border-b-2 border-zinc-900'
      : isDark
        ? 'text-zinc-500 hover:text-zinc-300'
        : 'text-zinc-500 hover:text-zinc-700';
  const commentBubble = isDark
    ? 'bg-zinc-950 p-3 rounded border border-zinc-800'
    : 'bg-zinc-100 p-3 rounded border border-zinc-200';
  const commentText = isDark ? 'text-sm text-zinc-300' : 'text-sm text-zinc-700';

  return (
    <div className="max-w-5xl min-w-0">
      <div
        className={`flex gap-6 mb-8 border-b pb-1 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 text-sm font-medium transition-colors ${tabActive(activeTab === 'approvals')}`}
        >
          Asset Approvals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-medium transition-colors ${tabActive(activeTab === 'invoices')}`}
        >
          Invoices &amp; Contracts
        </button>
      </div>

      {activeTab === 'approvals' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <div
              className={`relative aspect-video bg-black rounded-lg overflow-hidden group border shadow-2xl ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <img
                src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1000&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-60"
                alt="Preview"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                  <Play className="fill-white text-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold">Red Bull - Neon Drift (V3)</h3>
                <div className="w-full h-1 bg-zinc-700 mt-3 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-white" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 min-w-0">
              <button
                type="button"
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Approve Version
              </button>
              <button
                type="button"
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                }`}
              >
                <Download size={16} /> Download Proxy
              </button>
            </div>
          </div>

          <div className={`rounded-lg p-4 h-full flex flex-col min-w-0 ${appPanelClass(isDark)}`}>
            <h4
              className={`font-bold mb-4 flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              <MessageSquare size={16} /> Feedback
            </h4>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-4 min-w-0">
              <div className={commentBubble}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-500">00:12</span>
                  <span className="text-[10px] text-zinc-500">Yesterday</span>
                </div>
                <p className={commentText}>Can we make this transition slightly faster?</p>
              </div>
              <div className={commentBubble}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-500">01:45</span>
                  <span className="text-[10px] text-zinc-500">Yesterday</span>
                </div>
                <p className={commentText}>Logo needs to be 10% larger here.</p>
              </div>
            </div>
            <div>
              <textarea
                className={`${appInputClass(isDark)} focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none`}
                placeholder="Add a comment at 00:34..."
                rows={3}
              />
              <button
                type="button"
                className={`mt-2 w-full text-xs font-bold py-2 rounded ${
                  isDark
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                POST COMMENT
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 min-w-0">
          {MOCK_INVOICES.filter((i) => i.client === 'Nike').map((inv) => (
            <div
              key={inv.id}
              className={`p-6 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0 ${appPanelClass(
                isDark
              )}`}
            >
              <div>
                <div className="text-xs font-mono text-zinc-500 mb-1">{inv.id}</div>
                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  ${inv.amount.toLocaleString()}
                </div>
                <div className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Issued: {inv.date}
                </div>
              </div>
              <div className="text-left sm:text-right min-w-0">
                <div
                  className={`mb-3 inline-block px-3 py-1 rounded text-xs font-bold uppercase ${
                    inv.status === 'paid'
                      ? isDark
                        ? 'bg-green-950 text-green-400'
                        : 'bg-emerald-100 text-emerald-800'
                      : isDark
                        ? 'bg-yellow-950 text-yellow-400'
                        : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {inv.status}
                </div>
                {inv.status !== 'paid' && (
                  <button
                    type="button"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-semibold text-sm transition-colors"
                  >
                    <CreditCard size={16} /> Pay Now
                  </button>
                )}
              </div>
            </div>
          ))}

          <div
            className={`border border-dashed p-8 rounded-lg text-center ${
              isDark
                ? 'bg-zinc-900/30 border-zinc-800'
                : 'bg-zinc-100/50 border-zinc-300'
            }`}
          >
            <p className="text-zinc-500 text-sm">No other outstanding invoices.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientView;
