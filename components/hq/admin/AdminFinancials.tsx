import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MOCK_INVOICES_ADMIN, MOCK_ADMIN_PROJECTS, MOCK_PROPOSALS } from '../../../data/adminMock';
import { formatAdminDate, invoiceStatusClass, proposalStatusClass } from './adminFormat';

const chart = [
  { name: 'Jan', revenue: 40000 },
  { name: 'Feb', revenue: 30000 },
  { name: 'Mar', revenue: 55000 },
  { name: 'Apr', revenue: 48000 },
  { name: 'May', revenue: 70000 },
  { name: 'Jun', revenue: 62000 },
];

const AdminFinancials: React.FC = () => {
  const outstanding = useMemo(
    () => MOCK_INVOICES_ADMIN.filter((i) => i.status !== 'paid' && i.status !== 'void'),
    []
  );
  const openTotal = useMemo(
    () => outstanding.reduce((s, i) => s + (i.amount - i.amountPaid), 0),
    [outstanding]
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Financials</p>
        <h2 className="text-xl font-bold text-white">Invoices, proposals, cash (demo)</h2>
        <p className="text-sm text-zinc-500 mt-1">Stripe + Firebase in a later phase.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-500 text-xs uppercase font-bold">Open AR (mock)</p>
          <p className="text-3xl font-bold text-white mt-1">${openTotal.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-500 text-xs uppercase font-bold">Active projects (mock)</p>
          <p className="text-3xl font-bold text-white mt-1">
            {MOCK_ADMIN_PROJECTS.filter((p) => p.status === 'active').length}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 h-80">
        <h3 className="text-sm font-semibold text-white mb-2">Revenue (demo series)</h3>
        <ResponsiveContainer width="100%" height="88%">
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="fRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v / 1000}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#fafafa"
              strokeWidth={1.5}
              fill="url(#fRev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-bold text-zinc-400 mb-2">Proposals (mock)</h3>
        <div className="space-y-2">
          {MOCK_PROPOSALS.map((p) => (
            <div
              key={p.id}
              className="bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="text-white font-medium text-sm">
                  {p.clientName} — {MOCK_ADMIN_PROJECTS.find((x) => x.id === p.projectId)?.title}
                </p>
                <p className="text-xs text-zinc-500">Total: ${p.total.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${proposalStatusClass(
                    p.contractStatus
                  )}`}
                >
                  {p.contractStatus}
                </span>
                <Link
                  to={`/hq/admin/projects/${p.projectId}`}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  Open project
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-zinc-400 mb-2">Invoices (mock)</h3>
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
              <tr>
                <th className="text-left px-3 py-2">Id</th>
                <th className="text-left px-3 py-2">Client / project</th>
                <th className="text-right px-3 py-2">Open</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {MOCK_INVOICES_ADMIN.map((i) => (
                <tr key={i.id} className="hover:bg-zinc-900/20">
                  <td className="px-3 py-2.5 font-mono text-zinc-300">{i.id}</td>
                  <td className="px-3 py-2.5 text-zinc-200">
                    {i.clientName}
                    <span className="text-zinc-500 text-xs"> · {i.projectId}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-zinc-200">
                    ${(i.amount - i.amountPaid).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">{formatAdminDate(i.dueDate)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${invoiceStatusClass(
                        i.status
                      )}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      to={`/hq/admin/projects/${i.projectId}`}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Project
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminFinancials;
