import React from 'react';
import { MOCK_SCHEDULE } from '../../constants';
import { MapPin, Clock, FileText, CheckSquare, Shield } from 'lucide-react';

const StaffView: React.FC = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">My Call Sheets</h2>
        <p className="text-zinc-500">Upcoming productions and gear requirements.</p>
      </div>

      <div className="space-y-6">
        {MOCK_SCHEDULE.map((shoot) => (
            <div key={shoot.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded uppercase">Confirmed</span>
                             <h3 className="text-xl font-bold text-white">{shoot.title}</h3>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-zinc-400 mt-3">
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                {shoot.date}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin size={16} />
                                {shoot.location}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                         <button className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
                            <FileText size={16} />
                            Download PDF
                         </button>
                    </div>
                </div>
                
                <div className="p-6 bg-zinc-950/30 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <Shield size={14} /> Crew Manifest
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {shoot.crew.map((member, i) => (
                                <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
                                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold">
                                        {member.charAt(0)}
                                    </div>
                                    <span className="text-sm text-zinc-300">{member}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                             <CheckSquare size={14} /> Gear Checklist (Automated)
                        </h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li className="flex items-center gap-2">
                                <input type="checkbox" checked readOnly className="accent-white bg-zinc-800 border-zinc-700 rounded" />
                                <span>RED Komodo-X (Pkg A)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <input type="checkbox" className="accent-white bg-zinc-800 border-zinc-700 rounded" />
                                <span>Atlas Orion Anamorphic Set</span>
                            </li>
                             <li className="flex items-center gap-2">
                                <input type="checkbox" className="accent-white bg-zinc-800 border-zinc-700 rounded" />
                                <span>Teradek Bolt 6 Set</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default StaffView;