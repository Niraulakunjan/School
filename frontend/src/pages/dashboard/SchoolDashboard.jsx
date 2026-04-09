import React from 'react';
import { Users, BookOpen, Calendar, DollarSign, TrendingUp, UserCog, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const stats = [
  { title: 'Total Students', value: '—', icon: Users,    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    to: '/dashboard/students' },
  { title: 'Total Staff', value: '—', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', to: '/dashboard/staff' },
  { title: 'Attendance',     value: '—', icon: Calendar, color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  to: '/dashboard/attendance' },
  { title: 'Fees Collected', value: '—', icon: DollarSign,color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   to: '/dashboard/fees' },
];

const quickLinks = [
  { label: 'Manage Users',    icon: UserCog,   to: '/dashboard/users'      },
  { label: 'Students',        icon: Users,     to: '/dashboard/students'   },
  { label: 'Staff Management', icon: UserCog, to: '/dashboard/staff'   },
  { label: 'Attendance',      icon: Calendar,  to: '/dashboard/attendance' },
];

const SchoolDashboard = () => (
  <div className="space-y-6 max-w-7xl mx-auto">
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-black text-white tracking-tight">
        School <span className="text-gradient">Dashboard</span>
      </h1>
      <p className="text-slate-400 text-sm mt-1">Manage your school's students, staff, and operations.</p>
    </motion.div>

    {/* Stat Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div key={s.title}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
        >
          <Link to={s.to} className="block bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200 no-underline">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <ArrowUpRight size={14} className="text-slate-600" />
            </div>
            <p className="text-3xl font-black text-white tracking-tight leading-none mb-1">{s.value}</p>
            <p className="text-sm text-slate-400 font-medium">{s.title}</p>
          </Link>
        </motion.div>
      ))}
    </div>

    {/* Quick Links */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
    >
      <div>
        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Quick Access</p>
        <p className="text-white font-bold text-base">Navigate to a section</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickLinks.map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-all no-underline"
          >
            <Icon size={14} /> {label}
          </Link>
        ))}
      </div>
    </motion.div>
  </div>
);

export default SchoolDashboard;
