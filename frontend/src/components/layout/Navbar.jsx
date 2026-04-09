import React from 'react';
import { Bell, Search, User, ChevronDown } from 'lucide-react';
import { getTenantFromSubdomain } from '../../utils/tenant';

const Navbar = () => {
  const role = localStorage.getItem('user_role') || 'ADMIN';
  const isTenant = !!getTenantFromSubdomain();
  const roleLabel = isTenant ? 'School Admin' : 'Super Admin';

  return (
  <header className="min-h-[4rem] py-2 md:py-0 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between px-4 md:px-6 shrink-0 gap-y-3">
    <div className="flex-1 flex items-center h-full mr-4 md:mr-6 min-w-0">
        <div id="topbar-portal" className="flex items-center min-h-[4rem] w-full custom-portal-target bg-transparent -ml-4 md:-ml-6 min-w-0 overflow-x-auto no-scrollbar"></div>
        <div id="default-topbar-search" className="relative w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search students, teachers..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner shadow-black/20"
          />
        </div>
        <style>{`
            #topbar-portal:empty { display: none; }
            #topbar-portal:not(:empty) + #default-topbar-search { display: none; }
        `}</style>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      {/* Page Actions Portal */}
      <div id="topbar-actions-portal" className="flex items-center empty:hidden mr-2 border-r border-slate-700 pr-4 shrink-0 overflow-x-auto no-scrollbar max-w-[50vw]"></div>

      <button className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900" />
      </button>

      <div className="w-px h-6 bg-slate-700" />

      <div className="flex items-center gap-2.5 cursor-pointer group">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <User size={17} />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-bold text-white leading-none capitalize">{role.toLowerCase()}</p>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{roleLabel}</p>
        </div>
        <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
      </div>
    </div>
  </header>
  );
};

export default Navbar;
