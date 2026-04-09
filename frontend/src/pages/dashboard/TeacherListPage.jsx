import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { 
  UserPlus, Search, MoreVertical, ShieldCheck, Briefcase, 
  Loader2, DollarSign, Calculator, Layers, LayoutGrid, 
  List, Filter, Mail, Phone, ChevronRight, TrendingUp,
  Users, UserCheck, UserMinus, HardHat, Building2,
  Settings, UserCog
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherListPage = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [stats, setStats] = useState({ total: 0, active: 0, teaching: 0, admin: 0 });

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/teachers/');
            const data = res.data;
            setTeachers(data);
            
            // Calculate Stats
            setStats({
                total: data.length,
                active: data.filter(t => t.is_active_status === 'Active').length,
                teaching: data.filter(t => t.category_details?.name === 'Teaching').length,
                admin: data.filter(t => t.category_details?.name !== 'Teaching').length,
            });
        } catch (err) {
            console.error('Failed to load teachers', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = teachers.filter(t => {
        const matchesSearch = `${t.user?.first_name} ${t.user?.last_name} ${t.employee_id} ${t.post_details?.name}`.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === 'All' || t.category_details?.name === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...new Set(teachers.map(t => t.category_details?.name).filter(Boolean))];

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-1">
                    <h1 className="text-2xl font-black text-white tracking-tight">Staff Hub</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-0.5">Manage your institutional talent</p>
                </div>
                {[
                    { label: 'Total Personnel', value: stats.total, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Teaching Faculty', value: stats.teaching, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Support & Admin', value: stats.admin, icon: Building2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between group hover:border-slate-700 transition-all shadow-xl shadow-slate-950/20">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={22} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Action Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-4 flex flex-wrap items-center justify-between gap-6 shadow-2xl backdrop-blur-xl bg-slate-900/90 relative z-10">
                <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Find a staff member..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-12 pr-6 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                    <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block"></div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map(c => (
                            <button key={c} onClick={() => setFilterCategory(c)}
                                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all
                                    ${filterCategory === c ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}
                                `}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('new')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-full flex items-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest group">
                        <UserPlus size={18} className="group-hover:rotate-12 transition-transform" /> 
                         <span>Enroll Staff</span>
                    </button>
                </div>
            </div>

            {/* List Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 size={40} className="animate-spin text-indigo-500" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing Staff Data...</p>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    <motion.div 
                        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="space-y-3">
                         {/* Excel Table Header */}
                         <div className="hidden lg:flex items-center px-10 py-5 bg-slate-900 border border-slate-800 rounded-[2rem] mb-4 shadow-xl">
                            <div className="flex-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Institutional Personnel</div>
                            <div className="w-48 text-[10px] font-black text-slate-500 uppercase tracking-widest">Post / Department</div>
                            <div className="w-40 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Contact Hub</div>
                            <div className="w-32 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Current Status</div>
                            <div className="w-24 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Control</div>
                         </div>

                         {filtered.map((t, i) => (
                            <motion.div 
                                layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                key={t.id} className="group bg-slate-900 border border-slate-800 rounded-[2rem] p-4 flex flex-col lg:flex-row items-center gap-6 hover:border-indigo-500/50 hover:bg-slate-850 hover:shadow-2xl transition-all relative overflow-hidden">
                                 {/* Background Glow */}
                                 <div className="absolute left-0 top-0 w-24 h-full bg-indigo-500/5 blur-2xl -ml-12 group-hover:bg-indigo-500/10 transition-all rounded-full"></div>

                                 {/* Personnel Profile */}
                                 <div className="flex-1 flex items-center gap-5 relative z-10 w-full">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 font-black text-base uppercase tracking-tighter shadow-inner ring-4 ring-slate-900/50 overflow-hidden relative group-hover:border-indigo-500/50 transition-all">
                                        {t.user?.first_name?.charAt(0)}{t.user?.last_name?.charAt(0)}
                                        {/* Status Indicator */}
                                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${t.is_active_status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-white leading-none mb-1 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{t.user?.first_name} {t.user?.last_name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-slate-950 text-indigo-400 font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm border border-indigo-500/20">{t.employee_id}</span>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{t.user?.email || 'No digital footprint'}</p>
                                        </div>
                                    </div>
                                 </div>

                                 {/* Post / Category */}
                                 <div className="w-full lg:w-48 flex flex-col items-center lg:items-start gap-1 relative z-10 shrink-0">
                                    <span className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest block w-full text-center lg:text-left truncate shadow-sm">
                                        {t.post_details?.name || 'Standard Post'}
                                    </span>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t.category_details?.name || 'General'}</p>
                                 </div>

                                 {/* Contact Hub */}
                                 <div className="w-full lg:w-40 flex items-center justify-center gap-3 relative z-10 shrink-0">
                                     <button className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 hover:bg-indigo-600 hover:text-white border border-slate-700/50 hover:border-indigo-500/50 transition-all shadow-lg transform hover:-translate-y-1">
                                        <Mail size={16} />
                                     </button>
                                     <button className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 hover:bg-emerald-600 hover:text-white border border-slate-700/50 hover:border-emerald-500/50 transition-all shadow-lg transform hover:-translate-y-1">
                                        <Phone size={16} />
                                     </button>
                                 </div>

                                 {/* Status Center */}
                                 <div className="w-full lg:w-32 flex items-center justify-center relative z-10 shrink-0">
                                    <span className={`text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest border transition-all ${t.is_active_status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                        {t.is_active_status}
                                    </span>
                                 </div>

                                 {/* Action Suite */}
                                 <div className="w-full lg:w-24 flex items-center justify-end gap-2 relative z-10 shrink-0">
                                     <button onClick={() => navigate(`edit/${t.id}`)}
                                        className="p-3.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all transform hover:scale-105 active:scale-95 border border-indigo-400/20">
                                        <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                     </button>
                                 </div>
                            </motion.div>
                         ))}
                    </motion.div>
                </AnimatePresence>
            )}

            {filtered.length > 0 && (
                <div className="flex items-center justify-center pt-8">
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Showing {filtered.length} members of the establishment</p>
                </div>
            )}
        </div>
    );
};

export default TeacherListPage;
