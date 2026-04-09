import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Shield, Zap, Globe } from 'lucide-react';

const features = [
  { icon: Shield,   title: 'Database Isolation',  desc: 'Every school gets its own dedicated database for maximum security and performance.' },
  { icon: Users,    title: 'Role Based Access',    desc: 'Custom dashboards and permissions for admins, teachers, and students.' },
  { icon: BookOpen, title: 'Academic Tools',       desc: 'Manage attendance, grades, examinations, and assignments flawlessly.' },
];

const Landing = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col">
    {/* Background */}
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
    </div>

    {/* Navbar */}
    <nav className="relative flex items-center justify-between px-8 py-5 border-b border-slate-800/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
          S
        </div>
        <span className="text-white font-black text-lg">SajiloSchool</span>
      </div>
      <Link to="/login"
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all no-underline"
      >
        Sign In <ArrowRight size={14} />
      </Link>
    </nav>

    {/* Hero */}
    <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
        <Zap size={12} /> Multi-Tenant School Platform
      </div>

      <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6 max-w-3xl">
        Modern School Management,{' '}
        <span className="text-gradient">Simplified.</span>
      </h1>

      <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
        The all-in-one platform for administrators, teachers, and students. Isolated, secure, and blazingly fast.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/login"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 no-underline"
        >
          Get Started <ArrowRight size={16} />
        </Link>
        <a href="#features"
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold px-6 py-3 rounded-xl transition-all no-underline"
        >
          <Globe size={16} /> Learn More
        </a>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8 mt-14 pt-10 border-t border-slate-800 w-full max-w-lg justify-center">
        {[['500+', 'Schools'], ['50K+', 'Students'], ['99.9%', 'Uptime']].map(([val, label]) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-black text-white">{val}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </main>

    {/* Features */}
    <section id="features" className="relative px-6 pb-20">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, desc }, i) => (
          <div key={title}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Icon size={18} />
            </div>
            <h3 className="text-white font-bold text-base mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default Landing;
