import React from 'react';
import {
  Users, BookOpen, GraduationCap, TrendingUp,
  Building2, ArrowUpRight, Activity, ShieldCheck,
  Database, Plus, ExternalLink, Clock,
  CheckCircle2, AlertCircle, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const stats = [
  { title: 'Total Schools',  value: '12',    change: '+2',   icon: Building2,     color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { title: 'Total Students', value: '4,821', change: '+12%', icon: Users,          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  { title: 'Total Teachers', value: '386',   change: '+5%',  icon: BookOpen,       color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  { title: 'New Admissions', value: '143',   change: '+24%', icon: GraduationCap,  color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
];

const topSchools = [
  { name: 'Everest Academy',    domain: 'everest',  students: 842, active: true  },
  { name: 'Himalaya School',    domain: 'himalaya', students: 710, active: true  },
  { name: 'Sunrise Institute',  domain: 'sunrise',  students: 634, active: true  },
  { name: 'Valley High School', domain: 'valley',   students: 521, active: false },
];

const activity = [
  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', msg: 'New school "Everest Academy" deployed',       time: '2 min ago' },
  { icon: Users,        color: 'text-blue-400',    bg: 'bg-blue-500/10',    msg: 'Admin created for Himalaya School',           time: '1 hr ago'  },
  { icon: AlertCircle,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   msg: 'Valley High School marked inactive',          time: '3 hr ago'  },
  { icon: Database,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  msg: 'Database backup completed for all instances', time: '6 hr ago'  },
  { icon: ShieldCheck,  color: 'text-violet-400',  bg: 'bg-violet-500/10',  msg: 'Security audit passed — all systems nominal', time: '1 day ago' },
];

const health = [
  { label: 'API Response',    value: '98%',   pct: '98%',   bar: 'bg-emerald-500' },
  { label: 'DB Uptime',       value: '99.9%', pct: '99.9%', bar: 'bg-indigo-500'  },
  { label: 'Active Sessions', value: '74%',   pct: '74%',   bar: 'bg-violet-500'  },
  { label: 'Storage Used',    value: '42%',   pct: '42%',   bar: 'bg-amber-500'   },
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-2xl ${className}`}>
    {children}
  </div>
);

const Dashboard = () => (
  <div className="space-y-6 max-w-7xl mx-auto">

    {/* Header */}
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Super Admin <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Monitor and manage all school instances from one place.</p>
      </div>
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">All Systems Operational</span>
      </div>
    </motion.div>

    {/* Stat Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div key={s.title}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
              <s.icon size={18} className={s.color} />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
              <TrendingUp size={10} /> {s.change}
            </span>
          </div>
          <p className="text-3xl font-black text-white tracking-tight leading-none mb-1">{s.value}</p>
          <p className="text-sm text-slate-400 font-medium">{s.title}</p>
        </motion.div>
      ))}
    </div>

    {/* Quick Actions */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
    >
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={12} className="text-indigo-200" />
          <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Quick Actions</span>
        </div>
        <p className="text-white font-bold text-base">What would you like to do?</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'New School',     icon: Plus,       to: '/dashboard/tenants',  primary: true  },
          { label: 'Manage Schools', icon: Building2,  to: '/dashboard/tenants',  primary: false },
          { label: 'View Students',  icon: Users,      to: '/dashboard/students', primary: false },
          { label: 'View Staff',  icon: BookOpen,   to: '/dashboard/staff', primary: false },
        ].map(({ label, icon: Icon, to, primary }) => (
          <Link key={label} to={to}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all no-underline ${
              primary ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
            }`}
          >
            <Icon size={14} /> {label}
          </Link>
        ))}
      </div>
    </motion.div>

    {/* Bottom Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

      {/* Top Schools */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
        className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <p className="font-bold text-white text-sm">Top Schools</p>
            <p className="text-xs text-slate-500 mt-0.5">By student enrollment</p>
          </div>
          <Link to="/dashboard/tenants"
            className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 no-underline transition-colors"
          >
            View All <ArrowUpRight size={13} />
          </Link>
        </div>
        {topSchools.map((school, i) => (
          <div key={school.domain}
            className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/50 transition-colors ${i < topSchools.length - 1 ? 'border-b border-slate-800' : ''}`}
          >
            <span className="text-xs font-bold text-slate-600 w-4 text-center">{i + 1}</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">
              {school.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">{school.name}</p>
              <p className="text-xs text-slate-500">{school.domain}.localhost</p>
            </div>
            <div className="text-right mr-2">
              <p className="font-black text-sm text-white">{school.students.toLocaleString()}</p>
              <p className="text-xs text-slate-500">students</p>
            </div>
            <span className={`w-2 h-2 rounded-full shrink-0 ${school.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
            <button onClick={() => window.open(`http://${school.domain}.localhost:5173`, '_blank')}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors border-none bg-transparent cursor-pointer"
            >
              <ExternalLink size={13} />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
        className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <p className="font-bold text-white text-sm">Recent Activity</p>
            <p className="text-xs text-slate-500 mt-0.5">System-wide events</p>
          </div>
          <Activity size={15} className="text-slate-600" />
        </div>
        {activity.map(({ icon: Icon, color, bg, msg, time }, i) => (
          <div key={i}
            className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-800/50 transition-colors ${i < activity.length - 1 ? 'border-b border-slate-800' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon size={14} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 leading-snug">{msg}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock size={10} className="text-slate-600" />
                <span className="text-[11px] text-slate-500">{time}</span>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>

    {/* System Health */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-400" />
          <p className="font-bold text-white text-sm">System Health</p>
        </div>
        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          Healthy
        </span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {health.map(({ label, value, pct, bar }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-400">{label}</span>
              <span className="text-xs font-black text-white">{value}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${bar} rounded-full`} style={{ width: pct }} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>

  </div>
);

export default Dashboard;
