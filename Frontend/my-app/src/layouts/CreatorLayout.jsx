import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import CreatorSidebar from '../components/creator/CreatorSidebar';

export default function CreatorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fa] pt-24 pb-16">
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Build a premium course business
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-creator lg:hidden"
          >
            <FiMenu />
            Menu
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className={sidebarOpen ? 'block' : 'hidden lg:block'}>
            <CreatorSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
