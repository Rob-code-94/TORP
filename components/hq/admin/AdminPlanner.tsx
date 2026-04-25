import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_PLANNER, PLANNER_COLUMN_LABEL } from '../../../data/adminMock';
import { columnLabel, typeLabel } from './adminFormat';
import PlannerCalendar from './PlannerCalendar';
import type { PlannerBoardColumn, PlannerItem } from '../../../types';

const COLUMNS: PlannerBoardColumn[] = ['queue', 'active', 'post', 'client_review', 'complete'];

type View = 'list' | 'board' | 'calendar';

const AdminPlanner: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const items = MOCK_PLANNER;

  const board = useMemo(() => {
    const out: Record<PlannerBoardColumn, PlannerItem[]> = {
      queue: [],
      active: [],
      post: [],
      client_review: [],
      complete: [],
    };
    for (const t of items) {
      if (t.done) {
        out.complete.push(t);
      } else {
        out[t.column].push(t);
      }
    }
    return out;
  }, [items]);

  return (
    <div className="max-w-[1200px] min-w-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase text-zinc-500">Planner</p>
          <h2 className="text-xl font-bold text-white">All projects — tasks &amp; deliverables</h2>
        </div>
        <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-950/80 w-fit max-w-full overflow-x-auto">
          {(['list', 'board', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${
                view === v ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto min-w-0">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/60">
              <tr>
                <th className="text-left px-3 py-2">Task</th>
                <th className="text-left px-3 py-2">Project</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Column</th>
                <th className="text-left px-3 py-2">Assignee</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/30">
                  <td className="px-3 py-2.5 text-white">
                    {t.title}
                    {t.done && <span className="ml-1 text-zinc-500 text-xs">· done</span>}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    <Link to={`/hq/admin/projects/${t.projectId}`} className="hover:underline text-zinc-200">
                      {t.projectTitle}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">{typeLabel(t.type)}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{columnLabel(t.column)}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{t.assigneeName}</td>
                  <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">{t.dueDate}</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs uppercase">{t.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {COLUMNS.map((col) => (
            <div key={col} className="bg-zinc-900/20 border border-zinc-800 rounded-xl min-h-[200px] flex flex-col">
              <div className="px-3 py-2 border-b border-zinc-800/80 text-xs font-bold text-zinc-400 uppercase">
                {PLANNER_COLUMN_LABEL[col]}
                <span className="ml-1 text-zinc-600">({board[col].length})</span>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {board[col].map((t) => (
                  <div
                    key={t.id}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-sm"
                  >
                    <p className="text-white font-medium leading-snug">{t.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{t.projectTitle}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{t.dueDate}</p>
                  </div>
                ))}
                {board[col].length === 0 && <p className="text-xs text-zinc-600 p-1">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' && <PlannerCalendar items={items} />}
    </div>
  );
};

export default AdminPlanner;
