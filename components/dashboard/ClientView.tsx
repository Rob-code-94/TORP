import React, { useState } from 'react';
import { Play, MessageSquare, CheckCircle, Download, CreditCard } from 'lucide-react';
import { MOCK_INVOICES } from '../../constants';

const ClientView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'approvals' | 'invoices'>('approvals');

  return (
    <div className="max-w-5xl">
       <div className="flex gap-6 mb-8 border-b border-zinc-800 pb-1">
            <button 
                onClick={() => setActiveTab('approvals')}
                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'approvals' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Asset Approvals
            </button>
             <button 
                onClick={() => setActiveTab('invoices')}
                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Invoices & Contracts
            </button>
       </div>

       {activeTab === 'approvals' ? (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Video Player Area */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden group border border-zinc-800 shadow-2xl">
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
                    
                    <div className="flex gap-3">
                         <button className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                            <CheckCircle size={16} /> Approve Version
                         </button>
                         <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                            <Download size={16} /> Download Proxy
                         </button>
                    </div>
                </div>

                {/* Comments / Feedback */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 h-full flex flex-col">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <MessageSquare size={16} /> Feedback
                    </h4>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-4">
                        <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-blue-400">00:12</span>
                                <span className="text-[10px] text-zinc-500">Yesterday</span>
                            </div>
                            <p className="text-sm text-zinc-300">Can we make this transition slightly faster?</p>
                        </div>
                         <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-blue-400">01:45</span>
                                <span className="text-[10px] text-zinc-500">Yesterday</span>
                            </div>
                            <p className="text-sm text-zinc-300">Logo needs to be 10% larger here.</p>
                        </div>
                    </div>
                    <div>
                        <textarea 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white focus:outline-none focus:border-zinc-600 resize-none"
                            placeholder="Add a comment at 00:34..."
                            rows={3}
                        />
                        <button className="mt-2 w-full bg-white text-black text-xs font-bold py-2 rounded hover:bg-zinc-200">
                            POST COMMENT
                        </button>
                    </div>
                </div>
           </div>
       ) : (
           <div className="space-y-4">
               {MOCK_INVOICES.filter(i => i.client === 'Nike').map(inv => ( // Mock filtering for demo
                   <div key={inv.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg flex items-center justify-between">
                       <div>
                           <div className="text-xs font-mono text-zinc-500 mb-1">{inv.id}</div>
                           <div className="text-2xl font-bold text-white">${inv.amount.toLocaleString()}</div>
                           <div className="text-sm text-zinc-400 mt-1">Issued: {inv.date}</div>
                       </div>
                       <div className="text-right">
                           <div className={`mb-3 inline-block px-3 py-1 rounded text-xs font-bold uppercase ${inv.status === 'paid' ? 'bg-green-950 text-green-400' : 'bg-yellow-950 text-yellow-400'}`}>
                                {inv.status}
                           </div>
                           {inv.status !== 'paid' && (
                               <button className="block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-2">
                                   <CreditCard size={16} /> Pay Now
                               </button>
                           )}
                       </div>
                   </div>
               ))}
               
               <div className="bg-zinc-900/30 border border-zinc-800 border-dashed p-8 rounded-lg text-center">
                   <p className="text-zinc-500 text-sm">No other outstanding invoices.</p>
               </div>
           </div>
       )}
    </div>
  );
};

export default ClientView;