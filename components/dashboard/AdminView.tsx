import React from 'react';
import { MOCK_INVOICES } from '../../constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, FileText, Video } from 'lucide-react';

const data = [
  { name: 'Jan', revenue: 40000 },
  { name: 'Feb', revenue: 30000 },
  { name: 'Mar', revenue: 55000 },
  { name: 'Apr', revenue: 48000 },
  { name: 'May', revenue: 70000 },
  { name: 'Jun', revenue: 62000 },
];

const AdminView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-zinc-500 mb-1">Total Revenue (YTD)</p>
                    <h3 className="text-3xl font-bold text-white">$305,000</h3>
                </div>
                <div className="p-2 bg-green-950/30 rounded-lg text-green-500">
                    <DollarSign size={20} />
                </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-400">
                <TrendingUp size={14} className="mr-1" />
                <span>+12.5% from last month</span>
            </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
             <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-zinc-500 mb-1">Active Projects</p>
                    <h3 className="text-3xl font-bold text-white">8</h3>
                </div>
                <div className="p-2 bg-blue-950/30 rounded-lg text-blue-500">
                    <Video size={20} />
                </div>
            </div>
            <div className="mt-4 text-xs text-zinc-500">
                2 in post-production
            </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
             <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-zinc-500 mb-1">Outstanding Invoices</p>
                    <h3 className="text-3xl font-bold text-white">$32,400</h3>
                </div>
                <div className="p-2 bg-yellow-950/30 rounded-lg text-yellow-500">
                    <FileText size={20} />
                </div>
            </div>
             <div className="mt-4 text-xs text-zinc-500">
                3 invoices pending
            </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl h-96">
        <h3 className="text-lg font-semibold text-white mb-6">Revenue Trajectory</h3>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e4e4e7" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#e4e4e7" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#fff" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Invoice Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
            <h3 className="font-semibold text-white">Recent Invoices</h3>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/80">
                <tr>
                    <th className="px-6 py-3 font-medium">Invoice ID</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
                {MOCK_INVOICES.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-zinc-400">{inv.id}</td>
                        <td className="px-6 py-4 font-medium text-white">{inv.client}</td>
                        <td className="px-6 py-4 text-zinc-400">{inv.date}</td>
                        <td className="px-6 py-4 text-white">${inv.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                                inv.status === 'paid' ? 'bg-green-950/50 text-green-400 border border-green-900' :
                                inv.status === 'pending' ? 'bg-blue-950/50 text-blue-400 border border-blue-900' :
                                'bg-red-950/50 text-red-400 border border-red-900'
                            }`}>
                                {inv.status}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminView;