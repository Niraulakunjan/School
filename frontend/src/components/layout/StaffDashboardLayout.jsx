import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Users, DollarSign, Calculator, CalendarX, 
  BarChart3, Building2, 
  Settings, Briefcase, Layers, Percent,
  ChevronRight, LayoutGrid
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

const StaffDashboardLayout = () => {
  const location = useLocation();

  const menu = [
    {
      title: 'Transaction',
      items: [
        { name: 'Personnel', path: '/dashboard/staff', icon: Users },
        { name: 'Salary Units', path: '/dashboard/staff/salary', icon: DollarSign },
        { name: 'Monthly Sheet', path: '/dashboard/staff/payroll', icon: Calculator },
        { name: 'Attendance', path: '/dashboard/staff/absent', icon: CalendarX },
      ]
    },
    {
      title: 'Report',
      items: [
        { name: 'Summary', path: '/dashboard/staff/reports/total', icon: BarChart3 },
        { name: 'Disbursement', path: '/dashboard/staff/reports/bank', icon: Building2 },
      ]
    },
    {
      title: 'Setting',
      items: [
        { name: 'Deductions', path: '/dashboard/staff/settings/payroll', icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-80px)]">
      {/* Top Navigation injected to Global Navbar */}
      {document.getElementById('topbar-portal') && createPortal(
        <nav className="flex items-stretch min-h-[4rem] w-max lg:w-full">
          {menu.map((section, idx) => (
            <div key={idx} className="flex-1 border-r last:border-r-0 border-slate-800 flex flex-col justify-between h-full bg-slate-900/50 min-w-[240px] lg:min-w-0">
              <div className="bg-sky-500/90 px-4 py-1.5 flex items-center justify-between border-b border-sky-400/20 shadow-inner shadow-white/10 shrink-0">
                <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{section.title}</h3>
                <LayoutGrid size={10} className="text-white/40 hidden md:block" />
              </div>
              <div className="flex items-center gap-1 px-2 flex-1 overflow-x-auto no-scrollbar">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard/staff'}
                    className={({ isActive }) => `
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap
                      ${isActive 
                        ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20 ring-1 ring-indigo-400/50' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }
                    `}
                  >
                    <item.icon size={12} className={location.pathname === item.path ? 'text-white' : 'text-slate-500'} />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>,
        document.getElementById('topbar-portal')
      )}

      {/* Content Area */}
      <main className="flex-1 min-w-0 bg-slate-950 p-6 rounded-tl-xl border-t border-l border-slate-800 -ml-6 shadow-[inset_0_4px_24px_rgba(0,0,0,0.2)] relative">
        <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="pb-20 h-full">
           <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default StaffDashboardLayout;
