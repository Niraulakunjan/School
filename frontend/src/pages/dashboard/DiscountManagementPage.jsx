import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Ticket, Plus, Search, Loader2, X, Save, Pencil, Trash2, 
    UserPlus, Percent, Banknote, ShieldCheck, ShieldAlert,
    Filter, GraduationCap, Calendar, ChevronRight, ChevronDown, UserCircle2, 
    ArrowRightCircle, CheckCircle2, CheckSquare, Square, Users,
    TrendingDown, Users2, Layers, Briefcase, Zap, Info, Table as TableIcon
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

const inputCls = "w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white text-sm placeholder:text-slate-600 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all backdrop-blur-xl shadow-inner";
const selectCls = inputCls + " appearance-none cursor-pointer";

// --- Sub-components ---

const GlassCard = ({ title, value, icon: Icon, color }) => (
    <motion.div 
        whileHover={{ y: -5, scale: 1.02 }}
        className="relative group p-6 bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 rounded-[32px] overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-${color}-500/10 transition-all duration-500`} />
        <div className="relative z-10 flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center text-${color}-400 border border-${color}-500/20 shadow-lg`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</p>
                <h3 className="text-3xl font-black text-white italic tracking-tighter mt-1">{value}</h3>
            </div>
        </div>
    </motion.div>
);

const TabButton = ({ id, label, active, onClick }) => (
    <button 
        onClick={() => onClick(id)}
        className={`relative px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
    >
        {active && (
            <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-xl shadow-indigo-500/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
        <span className="relative z-10">{label}</span>
    </button>
);

const DiscountManagementPage = () => {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('students');
    
    const [policies, setPolicies] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [years, setYears] = useState([]);
    
    // Filters
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
    const [policyForm, setPolicyForm] = useState({ name: '', discount_type: 'percentage', value: '', is_active: true, description: '' });
    const [allocForm, setAllocForm] = useState({ student: '', discount: '', financial_year: '', is_active: true, notes: '' });
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [isBulkMode, setIsBulkMode] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, aRes, sRes, yRes, cRes] = await Promise.all([
                axios.get('/fee-discounts/'),
                axios.get('/student-discounts/'),
                axios.get('/students/'),
                axios.get('/financial-years/'),
                axios.get('/classes/')
            ]);
            setPolicies(pRes.data);
            setAllocations(aRes.data);
            setStudents(sRes.data);
            setYears(yRes.data);
            setClasses(cRes.data);
        } catch (err) { toast('Backend Sync Failed', 'error'); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Memoized Stats
    const sectionsForSelectedClass = useMemo(() => {
        if (!filterClass) return [];
        const cls = classes.find(c => String(c.name) === String(filterClass));
        return cls?.sections || [];
    }, [filterClass, classes]);

    const stats = useMemo(() => {
        const activeAllocations = allocations.filter(a => a.is_active).length;
        const totalValue = allocations.reduce((acc, a) => {
            if (!a.is_active) return acc;
            const val = parseFloat(a.discount_display?.replace('Rs. ', '') || 0);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return {
            activeAllocations,
            policyCount: policies.length,
            coverage: students.length > 0 ? ((activeAllocations / students.length) * 100).toFixed(1) : 0,
            estimatedMonthly: totalValue.toLocaleString()
        };
    }, [allocations, policies, students]);

    const filteredStudents = students.filter(s => {
        const matchesClass = !filterClass || String(s.class_name) === String(filterClass);
        const matchesSection = !filterSection || s.section === filterSection;
        const fullName = `${s.first_name || ''} ${s.last_name || ''}`;
        const matchesSearch = !searchQuery || fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesClass && matchesSection && matchesSearch;
    });

    const getStudentDiscountStatus = (studentId) => allocations.find(a => String(a.student) === String(studentId) && a.is_active);

    const toggleStudentSelection = (id) => setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const handleSavePolicy = async (e) => {
        e.preventDefault();
        try {
            if (editingPolicy) { await axios.put(`/fee-discounts/${editingPolicy.id}/`, policyForm); toast('Policy Secured'); }
            else { await axios.post('/fee-discounts/', policyForm); toast('Policy Published'); }
            setIsPolicyModalOpen(false); setEditingPolicy(null); fetchData();
        } catch (err) { toast('Execution Error', 'error'); }
    };

    const handleSaveAllocation = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isBulkMode) {
                await Promise.all(selectedStudentIds.map(sid => axios.post('/student-discounts/', { ...allocForm, student: sid })));
                toast(`Allocated to ${selectedStudentIds.length} students`);
            } else { await axios.post('/student-discounts/', allocForm); toast('Grant Assigned'); }
            setIsAllocModalOpen(false); setSelectedStudentIds([]); fetchData();
        } catch (err) { toast('Allocation Conflict', 'error'); } 
        finally { setLoading(false); }
    };

    if (loading && policies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Zap className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 px-4 relative">
            {/* Background pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
                <svg width="100%" height="100%"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
            </div>

            {/* Header section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
                <div className="flex items-center gap-3">
                    <Ticket size={24} className="text-indigo-400" />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Manage Discounts</h1>
                </div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative shrink-0 w-full md:w-auto">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800 text-indigo-400 font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl outline-none appearance-none cursor-pointer pr-12 shadow-2xl focus:border-indigo-500/50 transition-all hover:bg-slate-800/80 w-full md:min-w-[220px]"
                    >
                        <option value="students">View: Students</option>
                        <option value="allocations">View: Assigned Discounts</option>
                        <option value="policies">View: Discount Types</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown size={18} />
                    </div>
                </motion.div>
            </header>

 
            {/* Content Area */}
            <AnimatePresence mode="wait">
                {activeTab === 'students' ? (
                    <motion.div key="st-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8">
                        {/* Topbar Portal for Filters */}
                        {document.getElementById('topbar-portal') && createPortal(
                            <div className="flex w-full items-center gap-2 pr-4 pl-4 md:pl-6 h-full py-2">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Student by Name, ID, or Roll..." className="w-full bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-slate-200 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500 shadow-inner" />
                                </div>
                                <div className="flex shrink-0 gap-2 items-center">
                                    <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterSection(''); }} className="bg-slate-800 border border-slate-700 rounded-full py-2 px-3 text-slate-200 text-sm outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer w-32 shadow-inner">
                                        <option value="">All Classes</option>
                                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-full py-2 px-3 text-slate-200 text-sm outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer w-32 shadow-inner" disabled={!filterClass}>
                                        <option value="">All Sections</option>
                                        {(sectionsForSelectedClass || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                    <button onClick={() => { setFilterClass(''); setFilterSection(''); setSearchQuery(''); setSelectedStudentIds([]); }} className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-inner rounded-full text-slate-400 transition-all"><X size={15} /></button>
                                    <button onClick={() => setSelectedStudentIds(filteredStudents.map(s => s.id))} className="px-4 h-9 shrink-0 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-bold text-[11px] uppercase tracking-widest rounded-full transition-all border border-indigo-500/20 flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm">Select All <CheckSquare size={13} /></button>
                                </div>
                            </div>
                        , document.getElementById('topbar-portal'))}

                        {/* Emerald Data Matrix */}
                        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[48px] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-950/50 border-b border-white/5">
                                            <th className="w-16 border-r border-white/5 px-6 py-5 text-center"><TableIcon size={14} className="mx-auto text-slate-500" /></th>
                                            <th className="w-20 border-r border-white/5 px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Roll</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Student Name</th>
                                            <th className="w-40 border-x border-white/5 px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Class / Section</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Discount</th>
                                            <th className="w-56 px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-transparent">
                                        {filteredStudents.map((s, idx) => {
                                            const activeDisc = getStudentDiscountStatus(s.id);
                                            const isSel = selectedStudentIds.includes(s.id);
                                            return (
                                                <tr key={s.id} className={`group ${isSel ? 'bg-indigo-600/[0.05]' : 'hover:bg-slate-950/30'} transition-all`}>
                                                    <td className="border-r border-b border-white/5 px-6 py-4 text-center">
                                                        <button onClick={() => toggleStudentSelection(s.id)} className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${isSel ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'}`}>
                                                            {isSel && <CheckSquare size={12} className="text-white" />}
                                                        </button>
                                                    </td>
                                                    <td className="border-r border-b border-white/5 px-8 py-4 text-center text-[11px] font-black text-slate-400 font-mono italic">{s.roll_number || '—'}</td>
                                                    <td className="border-b border-white/5 px-8 py-4 font-black text-white text-xs uppercase group-hover:text-indigo-400 transition-colors tracking-tight">{s.first_name} {s.last_name}</td>
                                                    <td className="border-x border-b border-white/5 px-8 py-4 text-center">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">{s.class_name} • {s.section}</span>
                                                    </td>
                                                    <td className="border-b border-white/5 px-8 py-4">
                                                        {activeDisc ? (
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px] uppercase tracking-widest animate-in zoom-in-95">
                                                                < Zap size={10} /> {activeDisc.discount_name} (-{activeDisc.discount_display})
                                                            </div>
                                                        ) : <span className="text-[9px] font-black text-slate-600 uppercase italic tracking-widest">No Discount</span>}
                                                    </td>
                                                    <td className="border-b border-white/5 px-8 py-4 text-right">
                                                        <button onClick={() => { setAllocForm({...allocForm, student: s.id}); setIsBulkMode(false); setIsAllocModalOpen(true); }} className="px-5 py-2 bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">Allocate</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bulk Action Navigator */}
                        <AnimatePresence>
                            {selectedStudentIds.length > 0 && (
                                <motion.div initial={{ y: 150 }} animate={{ y: 0 }} exit={{ y: 150 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-8">
                                    <div className="bg-slate-950 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] border border-slate-800 rounded-[48px] p-6 flex items-center justify-between gap-12 ring-2 ring-indigo-500/20 backdrop-blur-3xl">
                                        <div className="flex items-center gap-6 pl-4">
                                            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-2xl animate-pulse"><Users2 size={28} /></div>
                                            <div>
                                                <h4 className="text-xl font-black text-white italic tracking-tighter">{selectedStudentIds.length} Students Selected</h4>
                                                <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] mt-1">Ready to Assign Discount</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pr-2">
                                            <button onClick={() => setSelectedStudentIds([])} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-500 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all">Cancel</button>
                                            <button onClick={() => { setIsBulkMode(true); setIsAllocModalOpen(true); }} className="px-10 py-4 bg-white text-slate-950 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95">Assign Discount →</button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : activeTab === 'policies' ? (
                    <motion.div key="p-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {policies.map(p => (
                            <motion.div key={p.id} whileHover={{ y: -8 }} className="group relative bg-slate-900/40 backdrop-blur-3xl border border-slate-800 p-8 rounded-[48px] hover:border-indigo-500/50 transition-all overflow-hidden border-t-indigo-500/10">
                                <div className="absolute top-0 right-0 p-5 flex gap-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-10">
                                    <button onClick={() => { setEditingPolicy(p); setPolicyForm(p); setIsPolicyModalOpen(true); }} className="p-4 bg-slate-800 hover:bg-indigo-600 rounded-[20px] text-slate-400 hover:text-white transition-all shadow-2xl border border-slate-700/50"><Pencil size={16} /></button>
                                    <button className="p-4 bg-slate-800 hover:bg-rose-500 rounded-[20px] text-slate-400 hover:text-white transition-all shadow-2xl border border-slate-700/50"><Trash2 size={16} /></button>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center text-3xl shadow-2xl ${p.discount_type === 'percentage' ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'}`}>
                                        {p.discount_type === 'percentage' ? <Percent size={32} /> : <Banknote size={32} />}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-black text-2xl text-white italic tracking-tighter uppercase">{p.name}</h3>
                                        <p className="text-4xl font-black text-white">{p.discount_type === 'percentage' ? `${parseFloat(p.value)}%` : `Rs. ${parseFloat(p.value).toLocaleString()}`}</p>
                                    </div>
                                    <p className="text-slate-500 text-[11px] font-bold leading-relaxed uppercase tracking-widest opacity-60 line-clamp-2">{p.description || "An active system discount."}</p>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-all duration-700" />
                            </motion.div>
                        ))}
                        <motion.button onClick={() => { setEditingPolicy(null); setPolicyForm({ name: '', discount_type: 'percentage', value: '', is_active: true, description: '' }); setIsPolicyModalOpen(true); }} whileHover={{ scale: 1.02 }} className="border-4 border-dashed border-slate-800 hover:border-indigo-500/40 rounded-[48px] flex flex-col items-center justify-center gap-4 transition-all group p-12 bg-slate-900/20 backdrop-blur-3xl min-h-[300px]">
                            <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-indigo-600 flex items-center justify-center text-slate-500 group-hover:text-white transition-all shadow-2xl"><Plus size={32} /></div>
                            <p className="text-[10px] font-black text-slate-500 group-hover:text-indigo-400 uppercase tracking-[0.4em] transition-colors">Create New Discount</p>
                        </motion.button>
                    </motion.div>
                ) : (
                    <motion.div key="a-view" className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800/80 rounded-[48px] overflow-hidden shadow-2xl ring-1 ring-white/5 pb-10">
                        <div className="p-12 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Assigned Discounts</h2>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.5em] mt-2 flex items-center gap-2">< Zap size={10} /> List of Students with Discounts</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950/20 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
                                    <tr><th className="px-12 py-8">Student Name</th><th className="px-12 py-8">Discount Name</th><th className="px-12 py-8">Amount</th><th className="px-12 py-8">Academic Year</th><th className="px-12 py-8">Status</th><th className="px-12 py-8 text-right pr-16" /></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/30">
                                    {allocations.map(a => (
                                        <tr key={a.id} className="hover:bg-indigo-600/[0.03] transition-colors group">
                                            <td className="px-12 py-7 font-black text-white group-hover:text-indigo-400 transition-colors text-base tracking-tight italic uppercase">{a.student_name}</td>
                                            <td className="px-12 py-7 text-slate-400 text-[11px] font-black uppercase tracking-widest">{a.discount_name}</td>
                                            <td className="px-12 py-7 font-black text-white text-2xl tracking-tighter italic">-{a.discount_display}</td>
                                            <td className="px-12 py-7 text-slate-500 text-[11px] font-black tracking-widest">{a.financial_year_name}</td>
                                            <td className="px-12 py-7">
                                                <button onClick={() => handleToggleStatus(a)} className={`px-6 py-2 rounded-[20px] text-[10px] font-black uppercase tracking-widest border transition-all duration-700 ${a.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:bg-rose-500 hover:text-white'}`}>
                                                    {a.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-12 py-7 text-right pr-16"><button className="p-4 text-slate-700 hover:text-white bg-slate-800 hover:bg-indigo-600 rounded-[20px] transition-all shadow-xl"><ChevronRight size={20} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grant Selection Overlay */}
            <AnimatePresence>
                {isAllocModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAllocModalOpen(false)} className="absolute inset-0 bg-slate-950/98 backdrop-blur-[64px]" />
                        <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }} className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[64px] shadow-[0_60px_150px_-30px_rgba(0,0,0,1)] overflow-hidden p-16 ring-1 ring-white/20">
                            <div className="flex items-center justify-between mb-12">
                                <h2 className="text-5xl font-black text-white italic tracking-tighter">Assign <span className="text-indigo-500 font-normal">Discount</span></h2>
                                <button onClick={() => setIsAllocModalOpen(false)} className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:rotate-180 transition-all duration-700 shadow-3xl"><X size={32} /></button>
                            </div>
                            
                            <div className="mb-12 p-8 rounded-[40px] bg-indigo-600/5 border border-indigo-500/30 flex items-center gap-6 shadow-3xl shadow-indigo-500/5">
                                <div className="p-5 bg-indigo-600 rounded-[24px] text-white shadow-3xl shadow-indigo-600/40 animate-pulse"><Users2 size={32} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] leading-none mb-3">Selected Student(s)</p>
                                    <p className="text-3xl font-black text-white italic tracking-tighter">{isBulkMode ? `${selectedStudentIds.length} Students` : students.find(s => String(s.id) === String(allocForm.student))?.full_name}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveAllocation} className="space-y-10">
                                <div className="grid grid-cols-1 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Select Discount</label>
                                        <select required value={allocForm.discount} onChange={e => setAllocForm({...allocForm, discount: e.target.value})} className={selectCls + " h-[70px] text-lg font-black bg-slate-800/80 border-slate-700 focus:bg-slate-950"}>
                                            <option value="">Choose a discount...</option>
                                            {policies.filter(p => p.is_active).map(p => <option key={p.id} value={p.id} className="bg-slate-900 font-bold">{p.name} (-{parseFloat(p.value)}{p.discount_type === 'percentage' ? '%' : ' Rs.'})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Academic Year</label>
                                        <select required value={allocForm.financial_year} onChange={e => setAllocForm({...allocForm, financial_year: e.target.value})} className={selectCls + " h-[70px] text-lg font-black bg-slate-800/80 border-slate-700 focus:bg-slate-950"}>
                                            <option value="">Select Year...</option>
                                            {years.map(y => <option key={y.id} value={y.id} className="bg-slate-900 font-bold">{y.name} {y.is_active && '(Default Primary)'}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-7 bg-white text-slate-950 rounded-[32px] font-black uppercase text-xs tracking-[0.4em] shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)] hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-95 group">
                                    Assign Discount <ArrowRightCircle size={20} className="inline ml-3 group-hover:translate-x-3 transition-transform" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Policy Manifest Modal */}
            <AnimatePresence>
                {isPolicyModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPolicyModalOpen(false)} className="absolute inset-0 bg-slate-950/98 backdrop-blur-[64px]" />
                        <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }} className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[64px] shadow-[0_60px_150px_-30px_rgba(0,0,0,1)] p-16">
                             <div className="flex items-center justify-between mb-12"><h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Discount <span className="text-indigo-500 font-normal">Type</span></h2><button onClick={() => setIsPolicyModalOpen(false)} className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-3xl"><X size={32} /></button></div>
                             <form onSubmit={handleSavePolicy} className="space-y-10">
                                <div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Discount Name</label><input required value={policyForm.name} onChange={e => setPolicyForm({...policyForm, name: e.target.value})} className={inputCls + " h-[70px] text-lg font-black bg-slate-800/80 border-slate-700"} placeholder="e.g. Merit-Grant v1" /></div>
                                <div className="grid grid-cols-2 gap-8"><div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Discount Type</label><select value={policyForm.discount_type} onChange={e => setPolicyForm({...policyForm, discount_type: e.target.value})} className={selectCls + " h-[70px] font-black"}><option value="percentage">Percentage</option><option value="flat">Flat Value</option></select></div><div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Amount</label><input required value={policyForm.value} onChange={e => setPolicyForm({...policyForm, value: e.target.value})} className={inputCls + " h-[70px] text-xl font-black"} /></div></div>
                                <button type="submit" className="w-full py-7 bg-white text-slate-950 rounded-[32px] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:bg-slate-100 transition-all">Save Discount</button>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DiscountManagementPage;
